// handlers/media.handler.ts

import { firestore } from "firebase-admin";
import { functions } from "firebase-functions";
import { AuthService } from "../services/auth.service";
import { WhatsAppService } from "../services/whatsapp.service";
import { MediaService } from "../services/media.service";
import { NotificationService } from "../services/notification.service";
import { Logger } from "../utils/logger";
import { Helpers } from "../utils/helpers";
import { Validator } from "../utils/validation";
import { UploadMediaRequest, UploadMediaResponse } from "../types/requests";
import { HttpsError } from "firebase-functions/https";

export class MediaHandler {
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

      // Update reference document
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
        file_size: optimizedBuffer.length,
      });

      Logger.info("Media upload completed", { whatsappMediaId, mediaDocId });

      return {
        success: true,
        whatsappMediaId,
        mediaDocId,
        message: "Media uploaded successfully",
      };
    } catch (error) {
      Logger.error("Media upload failed", error, { businessId, imageUrl });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async batchUploadMedia(
    businessId: string,
    productIds: string[],
    userId: string
  ): Promise<any> {
    try {
      await AuthService.validateBusinessAccess(userId, businessId);

      const results = {
        total: productIds.length,
        successful: 0,
        failed: 0,
        errors: [] as any[],
      };

      // Process in smaller batches to avoid timeouts
      const batches = Helpers.chunkArray(productIds, 5);

      for (const batch of batches) {
        const batchPromises = batch.map(async (productId) => {
          try {
            const productDoc = await firestore()
              .collection("products")
              .doc(productId)
              .get();
            if (!productDoc.exists) {
              throw new Error("Product not found");
            }

            const product = productDoc.data();
            if (product?.image_url && !product?.whatsapp_image_id) {
              await this.uploadMedia(
                {
                  businessId,
                  imageUrl: product.image_url,
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
              error: error.message,
            });
          }
        });

        await Promise.all(batchPromises);
      }

      Logger.info("Batch media upload completed", results);
      return results;
    } catch (error) {
      Logger.error("Batch media upload failed", error, { businessId });
      throw new functions.https.HttpsError(
        "internal",
        "Batch upload failed",
        error.message
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
            await firestore()
              .collection("whatsapp_media")
              .doc(media.id)
              .update({
                upload_status: "expired",
                expired_at: firestore.FieldValue.serverTimestamp(),
              });
            results.refreshed++;
          } else {
            throw new Error(uploadResult.error);
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            mediaId: media.id,
            error: error.message,
          });
        }
      }

      Logger.info("Media refresh completed", results);
      return results;
    } catch (error) {
      Logger.error("Media refresh failed", error, { businessId });
      throw new functions.https.HttpsError(
        "internal",
        "Media refresh failed",
        error.message
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
}
