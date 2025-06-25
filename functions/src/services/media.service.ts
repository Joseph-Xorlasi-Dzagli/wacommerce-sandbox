// services/media.service.ts

import { firestore } from "firebase-admin";
import axios from "axios";
import sharp from "sharp";
import { Storage } from "@google-cloud/storage";
import { APP_CONFIG } from "../config/constants";
import { Logger } from "../utils/logger";

export class MediaService {
  private static storage = new Storage();
  private static db = firestore();

  static async optimizeImage(
    imageUrl: string,
    purpose: string
  ): Promise<Buffer> {
    try {
      // Download image
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
        maxContentLength: 50 * 1024 * 1024,
      });

      const imageBuffer = Buffer.from(response.data);

      // Get dimensions based on purpose
      const dimensions =
        APP_CONFIG.IMAGE.FORMATS[
          purpose.toUpperCase() as keyof typeof APP_CONFIG.IMAGE.FORMATS
        ] || APP_CONFIG.IMAGE.FORMATS.PRODUCT;

      // Optimize using Sharp
      const optimizedBuffer = await sharp(imageBuffer)
        .resize(dimensions.width, dimensions.height, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({
          quality: APP_CONFIG.IMAGE.QUALITY,
          progressive: true,
        })
        .toBuffer();

      Logger.info("Image optimized", {
        originalSize: imageBuffer.length,
        optimizedSize: optimizedBuffer.length,
        purpose,
      });

      return optimizedBuffer;
    } catch (error) {
      Logger.error("Image optimization failed", error, { imageUrl, purpose });
      throw new Error(`Failed to optimize image: ${error.message}`);
    }
  }

  static async storeMediaMetadata(data: {
    businessId: string;
    whatsappMediaId: string;
    originalUrl: string;
    purpose: string;
    referenceId: string;
    referenceType: string;
    fileSize: number;
  }): Promise<string> {
    const mediaDoc = await this.db.collection("whatsapp_media").add({
      business_id: data.businessId,
      whatsapp_media_id: data.whatsappMediaId,
      original_url: data.originalUrl,
      type: "image",
      purpose: data.purpose,
      reference_id: data.referenceId,
      reference_type: data.referenceType,
      file_size: data.fileSize,
      mime_type: "image/jpeg",
      upload_status: "uploaded",
      uploaded_at: firestore.FieldValue.serverTimestamp(),
      expires_at: new Date(
        Date.now() +
          APP_CONFIG.WHATSAPP.MEDIA_EXPIRES_DAYS * 24 * 60 * 60 * 1000
      ),
      created_at: firestore.FieldValue.serverTimestamp(),
    });

    Logger.info("Media metadata stored", {
      mediaDocId: mediaDoc.id,
      whatsappMediaId: data.whatsappMediaId,
    });

    return mediaDoc.id;
  }

  static async updateProductMediaReference(
    productId: string,
    whatsappMediaId: string,
    originalUrl: string,
    referenceType: "products" | "categories" = "products"
  ): Promise<void> {
    const collection = referenceType === "products" ? "products" : "categories";

    await this.db.collection(collection).doc(productId).update({
      whatsapp_image_id: whatsappMediaId,
      whatsapp_image_url: originalUrl,
      updated_at: firestore.FieldValue.serverTimestamp(),
    });

    Logger.info("Product media reference updated", {
      productId,
      whatsappMediaId,
      collection,
    });
  }

  static async getExpiringMedia(
    businessId: string,
    bufferDays = 7
  ): Promise<any[]> {
    const expirationDate = new Date(
      Date.now() + bufferDays * 24 * 60 * 60 * 1000
    );

    const snapshot = await this.db
      .collection("whatsapp_media")
      .where("business_id", "==", businessId)
      .where("expires_at", "<=", expirationDate)
      .where("upload_status", "==", "uploaded")
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  static async cleanupUnusedMedia(
    businessId: string,
    olderThanDays = 30
  ): Promise<number> {
    const cutoffDate = new Date(
      Date.now() - olderThanDays * 24 * 60 * 60 * 1000
    );

    const mediaSnapshot = await this.db
      .collection("whatsapp_media")
      .where("business_id", "==", businessId)
      .where("created_at", "<=", cutoffDate)
      .get();

    let deletedCount = 0;
    const batch = this.db.batch();

    for (const mediaDoc of mediaSnapshot.docs) {
      const media = mediaDoc.data();
      const isReferenced = await this.isMediaReferenced(
        businessId,
        media.whatsapp_media_id,
        media.reference_type,
        media.reference_id
      );

      if (!isReferenced) {
        batch.delete(mediaDoc.ref);
        deletedCount++;
      }
    }

    await batch.commit();

    Logger.info("Media cleanup completed", {
      businessId,
      deletedCount,
      totalChecked: mediaSnapshot.size,
    });

    return deletedCount;
  }

  private static async isMediaReferenced(
    businessId: string,
    mediaId: string,
    referenceType: string,
    referenceId: string
  ): Promise<boolean> {
    try {
      if (referenceType === "products") {
        const productDoc = await this.db
          .collection("products")
          .doc(referenceId)
          .get();
        if (productDoc.exists) {
          const product = productDoc.data();
          return (
            product?.whatsapp_image_id === mediaId ||
            (product?.additional_image_ids &&
              product.additional_image_ids.includes(mediaId))
          );
        }
      }

      // Check for references in active orders
      const orderSnapshot = await this.db
        .collection("orders")
        .where("business_id", "==", businessId)
        .where("status", "in", ["pending", "processing"])
        .limit(5)
        .get();

      for (const orderDoc of orderSnapshot.docs) {
        const itemsSnapshot = await orderDoc.ref.collection("items").get();
        for (const itemDoc of itemsSnapshot.docs) {
          const item = itemDoc.data();
          if (item.whatsapp_image_id === mediaId) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      Logger.error("Error checking media references", error);
      return true; // Err on the side of caution
    }
  }
}
