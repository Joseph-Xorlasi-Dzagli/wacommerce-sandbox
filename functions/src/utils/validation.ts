// utils/validation.ts

import { functions } from "firebase-functions";
import { ERROR_CODES } from "../config/constants";

export class Validator {
  static validateAuth(context: functions.https.CallableContext): void {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        ERROR_CODES.AUTH_REQUIRED
      );
    }
  }

  static validateBusinessId(businessId: string): void {
    if (!businessId || typeof businessId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Business ID is required"
      );
    }
  }

  static validateImageUrl(imageUrl: string): void {
    try {
      new URL(imageUrl);
    } catch {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid image URL"
      );
    }
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s-()]+$/;
    return phoneRegex.test(phone);
  }
}
