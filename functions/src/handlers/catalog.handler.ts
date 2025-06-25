// functions/src/handlers/catalog.handler.ts
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { AuthService } from "../services/auth.service";
import { WhatsAppService } from "../services/whatsapp.service";
import { MediaService } from "../services/media.service";
import { NotificationService } from "../services/notification.service";
import { Logger } from "../utils/logger";
import { Helpers } from "../utils/helpers";
import { APP_CONFIG } from "../config/constants";
import { SyncCatalogRequest, SyncInventoryRequest } from "../types/requests";
import { Product } from "../types/entities";
import { SyncCatalogResponse, BaseResponse } from "../types/responses";

export class CatalogHandler {
  private static db = getFirestore();

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
        last_synced: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      Logger.info("Product updated successfully", { productId, updateFields });

      return {
        success: true,
        message: "Product updated successfully",
      };
    } catch (error) {
      Logger.error("Product update failed", error, { productId });

      // Update error status
      await this.db
        .collection("products")
        .doc(productId)
        .update({
          sync_status: "error",
          sync_error: (error as Error).message,
          last_synced: FieldValue.serverTimestamp(),
        });

      throw new HttpsError(
        "internal",
        "Update failed",
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
      let query = this.db
        .collection("products")
        .where("business_id", "==", businessId);

      if (productIds && productIds.length > 0) {
        query = query.where("id", "in", productIds);
      }

      const snapshot = await query.get();
      const products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];

      const updates = [];
      for (const product of products) {
        const updateFields = ["availability"];
        if (updatePrices) {
          updateFields.push("price");
        }

        const payload = await this.buildProductPayload(
          product,
          product.id,
          updateFields
        );
        updates.push(payload);
      }

      // Update in WhatsApp
      if (updates.length > 0) {
        await WhatsAppService.updateCatalogProducts(whatsappConfig, updates);
      }

      Logger.info("Inventory sync completed", {
        businessId,
        updatedCount: updates.length,
      });

      return {
        success: true,
        message: `Updated ${updates.length} products`,
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

  private static async getProductsToSync(
    businessId: string,
    syncType: "full" | "incremental" | "specific",
    productIds?: string[]
  ): Promise<Product[]> {
    let query = this.db
      .collection("products")
      .where("business_id", "==", businessId);

    switch (syncType) {
      case "full":
        // Get all products
        break;
      case "incremental":
        // Get products that need syncing
        query = query.where("sync_status", "in", ["pending", "error"]);
        break;
      case "specific":
        if (!productIds || productIds.length === 0) {
          throw new HttpsError(
            "invalid-argument",
            "Product IDs required for specific sync"
          );
        }
        query = query.where("id", "in", productIds);
        break;
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];
  }

  private static async processBatch(
    products: Product[],
    whatsappConfig: any,
    businessId: string
  ): Promise<{ successful: number; failed: number; errors: any[] }> {
    const result = {
      successful: 0,
      failed: 0,
      errors: [] as any[],
    };

    try {
      // Ensure media for all products
      for (const product of products) {
        if (product.image_url && !product.whatsapp_image_id) {
          await this.ensureProductMedia(businessId, product.id, product);
        }
      }

      // Format products for WhatsApp
      const formattedProducts = products.map((product) =>
        this.formatProductForWhatsApp(product.id, product)
      );

      // Send to WhatsApp
      await WhatsAppService.updateCatalogProducts(
        whatsappConfig,
        formattedProducts
      );

      // Update local status
      const batch = this.db.batch();
      products.forEach((product) => {
        const productRef = this.db.collection("products").doc(product.id);
        batch.update(productRef, {
          sync_status: "synced",
          sync_error: null,
          last_synced: FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
      result.successful = products.length;
    } catch (error) {
      Logger.error("Batch processing failed", error);

      // Mark all products in batch as failed
      const batch = this.db.batch();
      products.forEach((product) => {
        const productRef = this.db.collection("products").doc(product.id);
        batch.update(productRef, {
          sync_status: "error",
          sync_error: (error as Error).message,
          last_synced: FieldValue.serverTimestamp(),
        });

        result.errors.push({
          productId: product.id,
          error: (error as Error).message,
        });
      });

      await batch.commit();
      result.failed = products.length;
    }

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

    if (updateFields.includes("image_url") && product.whatsapp_image_id) {
      payload.image_url = `https://scontent.whatsapp.net/v/t61.24694-24/${product.whatsapp_image_id}`;
    }

    return payload;
  }
}
