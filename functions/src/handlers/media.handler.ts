// functions/src/handlers/media.handler.ts
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { AuthService } from "../services/auth.service";
import { WhatsAppService } from "../services/whatsapp.service";
import { MediaService } from "../services/media.service";
import { NotificationService } from "../services/notification.service";
import { Logger } from "../utils/logger";
import { Helpers } from "../utils/helpers";
import { Validator } from "../utils/validation";
import { UploadMediaRequest, UploadMediaResponse } from "../types/requests";

export class MediaHandler {
  private static db = getFirestore();

  static async uploadMedia(
    request: UploadMediaRequest,
    userId: string
  ): Promise<UploadMediaResponse> {
    const { businessId, imageUrl, purpose, referenceId, referenceType } =
      request;

    try {
      // Validate request
      Validator.validateImageUrl(imageUrl);
      await AuthService.validateBusinessAccess(userId, businessId);

      const whatsappConfig = await WhatsAppService.getConfig(businessId);

      Logger.info("Starting media upload", {
        businessId,
        purpose,
        referenceId,
      });

      // Optimize image
      const optimizedBuffer = await MediaService.optimizeImage(
        imageUrl,
        purpose
      );

      // Upload to WhatsApp
      const whatsappMediaId = await WhatsAppService.uploadMedia(
        whatsappConfig,
        optimizedBuffer,
        `${referenceId}.jpg`
      );

      // Store metadata
      const mediaDocId = await MediaService.storeMediaMetadata({
        businessId,
        whatsappMediaId,
        originalUrl: imageUrl,
        purpose,
        referenceId,
        referenceType,
        fileSize: optimizedBuffer.length,
      });

      // Update product/category reference
      await MediaService.updateProductMediaReference(
        referenceId,
        whatsappMediaId,
        imageUrl,
        referenceType
      );

      // Log analytics
      await NotificationService.logAnalytics(businessId, "media_upload", {
        purpose,
        reference_type: referenceType,
        reference_id: referenceId,
        file_size: optimizedBuffer.length,
      });

      Logger.info("Media upload completed", {
        whatsappMediaId,
        mediaDocId,
        referenceId,
      });

      return {
        success: true,
        whatsappMediaId,
        mediaDocId,
        message: "Media uploaded successfully",
      };
    } catch (error) {
      Logger.error("Media upload failed", error, {
        businessId,
        referenceId,
      });

      throw new HttpsError(
        "internal",
        "Media upload failed",
        (error as Error).message
      );
    }
  }

  static async batchUploadMedia(
    businessId: string,
    userId: string,
    productIds?: string[]
  ): Promise<any> {
    try {
      await AuthService.validateBusinessAccess(userId, businessId);

      // Get products that need media upload
      let query = this.db
        .collection("products")
        .where("business_id", "==", businessId)
        .where("image_url", "!=", null);

      if (productIds && productIds.length > 0) {
        query = query.where("id", "in", productIds);
      }

      const snapshot = await query.get();
      const products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const results = {
        total: products.length,
        successful: 0,
        failed: 0,
        errors: [] as any[],
      };

      // Process in smaller batches to avoid memory issues
      const batches = Helpers.chunkArray(products, 5);

      for (const batch of batches) {
        const batchPromises = batch.map(async (product) => {
          const productId = product.id;
          try {
            if ((product as any).image_url && !(product as any).whatsapp_image_id) {
              await this.uploadMedia(
                {
                  businessId,
                  imageUrl: (product as any).image_url,
                  purpose: "product",
                  referenceId: productId,
                  referenceType: "products",
                },
                userId
              );
            }

            results.successful++;
          } catch (error) {
            results.failed++;
            results.errors.push({
              productId,
              error: (error as Error).message,
            });
          }
        });

        await Promise.all(batchPromises);
      }

      Logger.info("Batch media upload completed", results);
      return results;
    } catch (error) {
      Logger.error("Batch media upload failed", error, { businessId });
      throw new HttpsError(
        "internal",
        "Batch upload failed",
        (error as Error).message
      );
    }
  }

  static async refreshExpiredMedia(
    businessId: string,
    userId: string,
    bufferDays = 7
  ): Promise<any> {
    try {
      await AuthService.validateBusinessAccess(userId, businessId);

      const expiringMedia = await MediaService.getExpiringMedia(
        businessId,
        bufferDays
      );

      const results = {
        total: expiringMedia.length,
        refreshed: 0,
        failed: 0,
        errors: [] as any[],
      };

      for (const media of expiringMedia) {
        try {
          // Re-upload media
          const uploadResult = await this.uploadMedia(
            {
              businessId,
              imageUrl: media.original_url,
              purpose: media.purpose,
              referenceId: media.reference_id,
              referenceType: media.reference_type,
            },
            userId
          );

          if (uploadResult.success) {
            // Mark old media as expired
            await this.db.collection("whatsapp_media").doc(media.id).update({
              upload_status: "expired",
              expired_at: FieldValue.serverTimestamp(),
            });
            results.refreshed++;
          } else {
            throw new Error(uploadResult.error || "Upload failed");
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            mediaId: media.id,
            error: (error as Error).message,
          });
        }
      }

      Logger.info("Media refresh completed", results);
      return results;
    } catch (error) {
      Logger.error("Media refresh failed", error, { businessId });
      throw new HttpsError(
        "internal",
        "Media refresh failed",
        (error as Error).message
      );
    }
  }

  static async cleanupUnusedMedia(
    businessId: string,
    userId: string,
    olderThanDays = 30
  ): Promise<any> {
    try {
      await AuthService.validateBusinessAccess(userId, businessId);

      const deletedCount = await MediaService.cleanupUnusedMedia(
        businessId,
        olderThanDays
      );

      return {
        success: true,
        deletedCount,
        message: `Cleaned up ${deletedCount} unused media files`,
      };
    } catch (error) {
      Logger.error("Media cleanup failed", error, { businessId });
      throw new HttpsError(
        "internal",
        "Cleanup failed",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  static async getMediaStats(businessId: string, userId: string): Promise<any> {
    try {
      await AuthService.validateBusinessAccess(userId, businessId);

      const snapshot = await this.db
        .collection("whatsapp_media")
        .where("business_id", "==", businessId)
        .get();

      const stats = {
        total: 0,
        uploaded: 0,
        expired: 0,
        failed: 0,
        totalSize: 0,
        byPurpose: {} as Record<string, number>,
      };

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        stats.total++;
        stats.totalSize += data.file_size || 0;

        // Count by status
        switch (data.upload_status) {
          case "uploaded":
            stats.uploaded++;
            break;
          case "expired":
            stats.expired++;
            break;
          case "failed":
            stats.failed++;
            break;
        }

        // Count by purpose
        const purpose = data.purpose || "unknown";
        stats.byPurpose[purpose] = (stats.byPurpose[purpose] || 0) + 1;
      });

      return stats;
    } catch (error) {
      Logger.error("Failed to get media stats", error, { businessId });
      throw new HttpsError(
        "internal",
        "Failed to get media stats",
        (error as Error).message
      );
    }
  }
}
