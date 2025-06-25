// handlers/catalog.handler.ts

import { firestore } from "firebase-admin";
// import { functions } from "firebase-functions";
import { AuthService } from "../services/auth.service";
import { WhatsAppService } from "../services/whatsapp.service";
import { MediaService } from "../services/media.service";
import { NotificationService } from "../services/notification.service";
import { Logger } from "../utils/logger";
import { Helpers } from "../utils/helpers";
import { APP_CONFIG } from "../config/constants";
import { SyncCatalogRequest, SyncInventoryRequest } from "../types/requests";
import { Product } from "../types/entities";
import { HttpsError } from "firebase-functions/v1/https";
import { SyncCatalogResponse, BaseResponse } from "../types/responses";

export class CatalogHandler {
  private static db = firestore();

  static async syncCatalog(
    request: SyncCatalogRequest,
    userId: string
  ): Promise<SyncCatalogResponse> {
    const { businessId, syncType, productIds } = request;

    try {
      // Validate access
      await AuthService.validateBusinessAccess(userId, businessId);

      // Get WhatsApp config
      const whatsappConfig = await WhatsAppService.getConfig(businessId);

      // Get products to sync
      const products = await this.getProductsToSync(
        businessId,
        syncType,
        productIds
      );

      Logger.info("Starting catalog sync", {
        businessId,
        syncType,
        productCount: products.length,
      });

      const results = {
        syncedProducts: 0,
        failedProducts: 0,
        errors: [] as Array<{ productId: string; error: string }>,
      };

      // Process in batches
      const batches = Helpers.chunkArray(
        products,
        APP_CONFIG.WHATSAPP.BATCH_SIZE
      );

      for (const batch of batches) {
        const batchResult = await this.processBatch(
          batch,
          whatsappConfig,
          businessId
        );
        results.syncedProducts += batchResult.successful;
        results.failedProducts += batchResult.failed;
        results.errors.push(...batchResult.errors);
      }

      // Log analytics
      await NotificationService.logAnalytics(businessId, "catalog_sync", {
        sync_type: syncType,
        products_synced: results.syncedProducts,
        errors_count: results.failedProducts,
      });

      Logger.info("Catalog sync completed", { businessId, results });

      return {
        success: true,
        syncedProducts: results.syncedProducts,
        failedProducts: results.failedProducts,
        errors: results.errors,
      };
    } catch (error) {
      Logger.error("Catalog sync failed", error, { businessId, syncType });
      throw new HttpsError("internal", "Sync failed", (error as Error).message);
    }
  }

  static async updateProduct(
    productId: string,
    businessId: string,
    userId: string,
    updateFields: string[]
  ): Promise<BaseResponse> {
    try {
      await AuthService.validateBusinessAccess(userId, businessId);

      const whatsappConfig = await WhatsAppService.getConfig(businessId);
      const productDoc = await this.db
        .collection("products")
        .doc(productId)
        .get();

      if (!productDoc.exists) {
        throw new HttpsError("not-found", "Product not found");
      }

      const product = productDoc.data() as Product;

      // Build WhatsApp update payload
      const updatePayload = await this.buildProductPayload(
        product,
        productId,
        updateFields
      );

      // Update in WhatsApp
      await WhatsAppService.updateCatalogProducts(whatsappConfig, [
        updatePayload,
      ]);

      // Update local status
      await productDoc.ref.update({
        sync_status: "synced",
        sync_error: null,
        last_synced: firestore.FieldValue.serverTimestamp(),
      });

      Logger.info("Product updated successfully", { productId, updateFields });

      return { success: true, message: "Product updated successfully" };
    } catch (error) {
      Logger.error("Product update failed", error, { productId, updateFields });

      // Update error status
      await this.db
        .collection("products")
        .doc(productId)
        .update({
          sync_status: "error",
          sync_error: (error as Error).message,
          last_synced: firestore.FieldValue.serverTimestamp(),
        });

      throw new HttpsError(
        "internal",
        "Update failed",
        (error as Error).message
      );
    }
  }

  static async deleteProduct(
    productId: string,
    businessId: string,
    userId: string,
    deleteFromWhatsApp: boolean
  ): Promise<BaseResponse> {
    try {
      await AuthService.validateBusinessAccess(userId, businessId);

      const productDoc = await this.db
        .collection("products")
        .doc(productId)
        .get();
      if (!productDoc.exists) {
        throw new HttpsError("not-found", "Product not found");
      }

      const product = productDoc.data();

      if (deleteFromWhatsApp && product?.whatsapp_product_id) {
        // Note: WhatsApp deletion would be implemented here
        // For now, we'll just mark as deleted locally
        Logger.info("Product marked for WhatsApp deletion", { productId });
      }

      // Clean up media references
      await this.cleanupProductMedia(businessId, productId);

      // Update product status
      await productDoc.ref.update({
        whatsapp_product_id: firestore.FieldValue.delete(),
        whatsapp_image_id: firestore.FieldValue.delete(),
        sync_status: "pending",
        last_synced: firestore.FieldValue.serverTimestamp(),
      });

      Logger.info("Product deleted successfully", {
        productId,
        deleteFromWhatsApp,
      });

      return { success: true, message: "Product deleted successfully" };
    } catch (error) {
      Logger.error("Product deletion failed", error, { productId });
      throw new HttpsError(
        "internal",
        "Deletion failed",
        (error as Error).message
      );
    }
  }

  static async syncInventory(
    request: SyncInventoryRequest,
    userId: string
  ): Promise<BaseResponse> {
    const { businessId, productIds, updatePrices } = request;

    try {
      await AuthService.validateBusinessAccess(userId, businessId);

      const whatsappConfig = await WhatsAppService.getConfig(businessId);

      // Get products to update
      let productsQuery = this.db
        .collection("products")
        .where("business_id", "==", businessId);

      if (productIds && productIds.length > 0) {
        productsQuery = productsQuery.where(
          firestore.FieldPath.documentId(),
          "in",
          productIds
        );
      }

      const productsSnapshot = await productsQuery.get();
      const updates: any[] = [];

      // Process each product
      for (const productDoc of productsSnapshot.docs) {
        const product = productDoc.data();

        // Get current inventory
        const inventory = await this.getProductInventory(
          businessId,
          productDoc.id
        );

        // Build update payload
        const updatePayload = this.buildInventoryPayload(
          product,
          productDoc.id,
          inventory,
          !!updatePrices
        );

        updates.push(updatePayload);
      }

      // Send batch update to WhatsApp
      if (updates.length > 0) {
        const batches = Helpers.chunkArray(
          updates,
          APP_CONFIG.WHATSAPP.BATCH_SIZE
        );

        for (const batch of batches) {
          await WhatsAppService.updateCatalogProducts(whatsappConfig, batch);
        }

        // Update local sync status
        const batch = this.db.batch();
        productsSnapshot.docs.forEach((doc) => {
          batch.update(doc.ref, {
            sync_status: "synced",
            last_synced: firestore.FieldValue.serverTimestamp(),
          });
        });
        await batch.commit();
      }

      // Log analytics
      await NotificationService.logAnalytics(businessId, "inventory_sync", {
        products_updated: updates.length,
        price_updates_included: updatePrices,
      });

      Logger.info("Inventory sync completed", {
        businessId,
        updatedProducts: updates.length,
      });

      return {
        success: true,
        message: `Successfully updated ${updates.length} products`,
      };
    } catch (error) {
      Logger.error("Inventory sync failed", error, { businessId });
      throw new HttpsError(
        "internal",
        "Inventory sync failed",
        (error as Error).message
      );
    }
  }

  static async getSyncStatus(
    businessId: string,
    userId: string,
    includeDetails: boolean
  ): Promise<any> {
    try {
      await AuthService.validateBusinessAccess(userId, businessId);

      const productsSnapshot = await this.db
        .collection("products")
        .where("business_id", "==", businessId)
        .get();

      const stats = {
        totalProducts: productsSnapshot.size,
        syncedProducts: 0,
        pendingProducts: 0,
        errorProducts: 0,
        completionPercentage: 0,
        productDetails: [] as any[],
      };

      productsSnapshot.docs.forEach((doc) => {
        const product = doc.data();
        const syncStatus = product.sync_status || "pending";

        switch (syncStatus) {
          case "synced":
            stats.syncedProducts++;
            break;
          case "pending":
            stats.pendingProducts++;
            break;
          case "error":
            stats.errorProducts++;
            break;
        }

        if (includeDetails) {
          stats.productDetails.push({
            id: doc.id,
            name: product.name,
            syncStatus,
            syncError: product.sync_error,
            lastSynced: product.last_synced,
          });
        }
      });

      stats.completionPercentage =
        stats.totalProducts > 0
          ? Math.round((stats.syncedProducts / stats.totalProducts) * 100)
          : 0;

      return {
        success: true,
        ...stats,
      };
    } catch (error) {
      Logger.error("Status check failed", error, { businessId });
      throw new HttpsError(
        "internal",
        "Status check failed",
        (error as Error).message
      );
    }
  }

  // Private helper methods
  private static async getProductsToSync(
    businessId: string,
    syncType: string,
    productIds?: string[]
  ): Promise<any[]> {
    let productsQuery = this.db
      .collection("products")
      .where("business_id", "==", businessId);

    if (syncType === "specific" && productIds) {
      productsQuery = productsQuery.where(
        firestore.FieldPath.documentId(),
        "in",
        productIds
      );
    } else if (syncType === "incremental") {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      productsQuery = productsQuery.where("updated_at", ">=", oneDayAgo);
    }

    const snapshot = await productsQuery.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  private static async processBatch(
    products: any[],
    whatsappConfig: any,
    businessId: string
  ): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ productId: string; error: string }>;
  }> {
    const result = { successful: 0, failed: 0, errors: [] as any[] };
    const batch = this.db.batch();

    try {
      // Ensure media and format products
      const catalogProducts = await Promise.all(
        products.map(async (product) => {
          await this.ensureProductMedia(businessId, product.id, product);
          return this.formatProductForWhatsApp(product.id, product);
        })
      );

      // Send to WhatsApp
      await WhatsAppService.updateCatalogProducts(
        whatsappConfig,
        catalogProducts
      );

      // Update local status
      products.forEach((product) => {
        const productRef = this.db.collection("products").doc(product.id);
        batch.update(productRef, {
          sync_status: "synced",
          sync_error: null,
          last_synced: firestore.FieldValue.serverTimestamp(),
        });
      });

      result.successful = products.length;
    } catch (error) {
      Logger.error("Batch processing failed", error);

      // Mark all products in batch as failed
      products.forEach((product) => {
        const productRef = this.db.collection("products").doc(product.id);
        batch.update(productRef, {
          sync_status: "error",
          sync_error: (error as Error).message,
          last_synced: firestore.FieldValue.serverTimestamp(),
        });

        result.errors.push({
          productId: product.id,
          error: (error as Error).message,
        });
      });

      result.failed = products.length;
    }

    await batch.commit();
    return result;
  }

  private static async ensureProductMedia(
    businessId: string,
    productId: string,
    product: any
  ): Promise<void> {
    if (!product.whatsapp_image_id && product.image_url) {
      try {
        // Optimize and upload image
        const imageBuffer = await MediaService.optimizeImage(
          product.image_url,
          "product"
        );
        const whatsappConfig = await WhatsAppService.getConfig(businessId);
        const whatsappMediaId = await WhatsAppService.uploadMedia(
          whatsappConfig,
          imageBuffer,
          `${productId}.jpg`
        );

        // Store metadata
        await MediaService.storeMediaMetadata({
          businessId,
          whatsappMediaId,
          originalUrl: product.image_url,
          purpose: "product",
          referenceId: productId,
          referenceType: "products",
          fileSize: imageBuffer.length,
        });

        // Update product reference
        await MediaService.updateProductMediaReference(
          productId,
          whatsappMediaId,
          product.image_url
        );

        product.whatsapp_image_id = whatsappMediaId;
      } catch (error) {
        Logger.error("Failed to upload product media", error, { productId });
        // Continue without media
      }
    }
  }

  private static formatProductForWhatsApp(
    productId: string,
    product: any
  ): any {
    // Use retailer_id if present, else fallback to productId
    const retailerId = (product as any).retailer_id || productId;
    return {
      retailer_id: retailerId,
      name: product.name,
      description: product.description || "",
      price: Math.round((product.price || 0) * 100), // Convert to cents
      currency: "GHS",
      availability:
        (product.stock_quantity || 0) > 0 ? "in stock" : "out of stock",
      image_url: (product as any).whatsapp_image_id
        ? `https://scontent.whatsapp.net/v/t61.24694-24/${
            (product as any).whatsapp_image_id
          }`
        : undefined,
      url: `https://yourapp.com/products/${productId}`,
      category: product.category_name || "General",
    };
  }

  private static async buildProductPayload(
    product: Product,
    productId: string,
    updateFields: string[]
  ): Promise<any> {
    // Use retailer_id if present, else fallback to productId
    const retailerId = (product as any).retailer_id || productId;
    const payload: any = {
      retailer_id: retailerId,
    };

    if (updateFields.includes("name")) {
      payload.name = product.name;
    }

    if (updateFields.includes("price")) {
      payload.price = Math.round(product.price * 100);
      payload.currency = "GHS";
    }

    if (updateFields.includes("description")) {
      payload.description = product.description || "";
    }

    if (updateFields.includes("availability")) {
      payload.availability =
        product.stock_quantity > 0 ? "in stock" : "out of stock";
    }

    if (updateFields.includes("image") && product.image_url) {
      await this.ensureProductMedia(product.business_id, productId, product);
      if ((product as any).whatsapp_image_id) {
        payload.image_url = `https://scontent.whatsapp.net/v/t61.24694-24/${
          (product as any).whatsapp_image_id
        }`;
      }
    }

    return payload;
  }

  private static async getProductInventory(
    businessId: string,
    productId: string
  ): Promise<any> {
    const inventorySnapshot = await this.db
      .collection("inventory")
      .where("product_id", "==", productId)
      .where("business_id", "==", businessId)
      .limit(1)
      .get();

    if (!inventorySnapshot.empty) {
      return inventorySnapshot.docs[0].data();
    }

    return { stock_quantity: 0, stock_status: "out_of_stock" };
  }

  private static buildInventoryPayload(
    product: any,
    productId: string,
    inventory: any,
    updatePrices: boolean
  ): any {
    const stockQuantity = inventory.stock_quantity || 0;
    let availability = "in stock";

    if (stockQuantity === 0) {
      availability = "out of stock";
    } else if (inventory.stock_status === "low_stock") {
      availability = "limited quantity";
    }

    // Use retailer_id if present, else fallback to productId
    const retailerId = (product as any).retailer_id || productId;
    const payload: any = {
      retailer_id: retailerId,
      availability,
    };

    if (updatePrices) {
      payload.price = Math.round((product.price || 0) * 100);
      payload.currency = "GHS";
    }

    return payload;
  }

  private static async cleanupProductMedia(
    businessId: string,
    productId: string
  ): Promise<void> {
    const mediaSnapshot = await this.db
      .collection("whatsapp_media")
      .where("business_id", "==", businessId)
      .where("reference_id", "==", productId)
      .get();

    const batch = this.db.batch();
    mediaSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    if (!mediaSnapshot.empty) {
      await batch.commit();
      Logger.info("Product media cleaned up", {
        productId,
        mediaCount: mediaSnapshot.size,
      });
    }
  }
}
