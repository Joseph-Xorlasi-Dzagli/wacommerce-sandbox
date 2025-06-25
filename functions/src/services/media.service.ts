// functions/src/services/media.service.ts
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import axios from "axios";
import sharp from "sharp";
import { Storage } from "@google-cloud/storage";
import { APP_CONFIG } from "../config/constants";
import { Logger } from "../utils/logger";

export class MediaService {
  private static storage = new Storage();
  private static db = getFirestore();

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
      throw new Error(`Failed to optimize image: ${(error as Error).message}`);
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
      uploaded_at: FieldValue.serverTimestamp(),
      expires_at: new Date(
        Date.now() +
          APP_CONFIG.WHATSAPP.MEDIA_EXPIRES_DAYS * 24 * 60 * 60 * 1000
      ),
      created_at: FieldValue.serverTimestamp(),
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
      image_url: originalUrl,
      updated_at: FieldValue.serverTimestamp(),
    });

    Logger.info("Product media reference updated", {
      productId,
      whatsappMediaId,
      referenceType,
    });
  }

  static async getExpiringMedia(
    businessId: string,
    bufferDays: number
  ): Promise<any[]> {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + bufferDays);

    const snapshot = await this.db
      .collection("whatsapp_media")
      .where("business_id", "==", businessId)
      .where("upload_status", "==", "uploaded")
      .where("expires_at", "<=", expirationDate)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  static async cleanupUnusedMedia(
    businessId: string,
    olderThanDays: number
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Find unused media older than cutoff date
    const snapshot = await this.db
      .collection("whatsapp_media")
      .where("business_id", "==", businessId)
      .where("upload_status", "==", "expired")
      .where("created_at", "<=", cutoffDate)
      .get();

    // Delete in batches
    const batch = this.db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    Logger.info("Unused media cleaned up", {
      businessId,
      deletedCount: snapshot.docs.length,
      olderThanDays,
    });

    return snapshot.docs.length;
  }

  static async refreshMediaUrl(
    mediaId: string,
    newWhatsappMediaId: string
  ): Promise<void> {
    await this.db
      .collection("whatsapp_media")
      .doc(mediaId)
      .update({
        whatsapp_media_id: newWhatsappMediaId,
        upload_status: "uploaded",
        uploaded_at: FieldValue.serverTimestamp(),
        expires_at: new Date(
          Date.now() +
            APP_CONFIG.WHATSAPP.MEDIA_EXPIRES_DAYS * 24 * 60 * 60 * 1000
        ),
        updated_at: FieldValue.serverTimestamp(),
      });

    Logger.info("Media URL refreshed", { mediaId, newWhatsappMediaId });
  }

  static async getMediaByReference(
    referenceId: string,
    referenceType: string
  ): Promise<any | null> {
    const snapshot = await this.db
      .collection("whatsapp_media")
      .where("reference_id", "==", referenceId)
      .where("reference_type", "==", referenceType)
      .where("upload_status", "==", "uploaded")
      .orderBy("created_at", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    };
  }
}
