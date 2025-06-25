// services/auth.service.ts

import { firestore } from "firebase-admin";
import { functions } from "firebase-functions";
import { Logger } from "../utils/logger";
import { ERROR_CODES } from "../config/constants";

export class AuthService {
  private static db = firestore();

  static async validateBusinessAccess(
    userId: string,
    businessId: string
  ): Promise<void> {
    try {
      const businessDoc = await this.db
        .collection("businesses")
        .doc(businessId)
        .get();

      if (!businessDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          ERROR_CODES.BUSINESS_NOT_FOUND
        );
      }

      const business = businessDoc.data();
      if (business?.owner_id !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Access denied to business"
        );
      }

      if (!business?.whatsapp_enabled) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          ERROR_CODES.WHATSAPP_NOT_CONFIGURED
        );
      }

      Logger.debug("Business access validated", { userId, businessId });
    } catch (error) {
      Logger.error("Business access validation failed", error, {
        userId,
        businessId,
      });
      throw error;
    }
  }

  static async getBusinessOwner(businessId: string): Promise<string> {
    const businessDoc = await this.db
      .collection("businesses")
      .doc(businessId)
      .get();

    if (!businessDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        ERROR_CODES.BUSINESS_NOT_FOUND
      );
    }

    return businessDoc.data()?.owner_id;
  }

  static async isBusinessWhatsAppEnabled(businessId: string): Promise<boolean> {
    const businessDoc = await this.db
      .collection("businesses")
      .doc(businessId)
      .get();
    return businessDoc.exists && businessDoc.data()?.whatsapp_enabled === true;
  }
}
