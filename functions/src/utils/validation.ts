// functions/src/utils/validation.ts
import { HttpsError } from "firebase-functions/v2/https";

export class Validator {
  static validateImageUrl(url: string): void {
    if (!url || typeof url !== "string") {
      throw new HttpsError("invalid-argument", "Image URL is required");
    }

    const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
    if (!urlPattern.test(url)) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid image URL format. Must be a valid HTTP/HTTPS URL with image extension"
      );
    }
  }

  static validateBusinessId(businessId: string): void {
    if (!businessId || typeof businessId !== "string") {
      throw new HttpsError("invalid-argument", "Business ID is required");
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(businessId)) {
      throw new HttpsError(
        "invalid-argument",
        "Business ID contains invalid characters"
      );
    }
  }

  static validatePhoneNumber(phone: string): void {
    if (!phone || typeof phone !== "string") {
      throw new HttpsError("invalid-argument", "Phone number is required");
    }

    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10 || cleaned.length > 15) {
      throw new HttpsError("invalid-argument", "Invalid phone number length");
    }
  }

  static validateSyncType(syncType: string): void {
    const validTypes = ["full", "incremental", "specific"];
    if (!validTypes.includes(syncType)) {
      throw new HttpsError(
        "invalid-argument",
        `Invalid sync type. Must be one of: ${validTypes.join(", ")}`
      );
    }
  }

  static validateProductId(productId: string): void {
    if (!productId || typeof productId !== "string") {
      throw new HttpsError("invalid-argument", "Product ID is required");
    }

    if (productId.length < 1 || productId.length > 100) {
      throw new HttpsError(
        "invalid-argument",
        "Product ID must be between 1 and 100 characters"
      );
    }
  }

  static validatePrice(price: number): void {
    if (typeof price !== "number" || price < 0) {
      throw new HttpsError(
        "invalid-argument",
        "Price must be a non-negative number"
      );
    }
  }

  static validateEmail(email: string): void {
    if (!email || typeof email !== "string") {
      throw new HttpsError("invalid-argument", "Email is required");
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      throw new HttpsError("invalid-argument", "Invalid email format");
    }
  }
}
