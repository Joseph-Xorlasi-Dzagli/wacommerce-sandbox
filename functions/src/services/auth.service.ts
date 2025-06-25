// functions/src/services/auth.service.ts
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { Logger } from "../utils/logger";

export class AuthService {
  private static db = getFirestore();

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
        throw new HttpsError("not-found", "Business not found");
      }

      const business = businessDoc.data();
      const hasAccess =
        business?.owner_id === userId ||
        business?.members?.includes(userId) ||
        business?.admins?.includes(userId);

      if (!hasAccess) {
        throw new HttpsError(
          "permission-denied",
          "Insufficient permissions for this business"
        );
      }

      Logger.info("Business access validated", { userId, businessId });
    } catch (error) {
      Logger.error("Business access validation failed", error, {
        userId,
        businessId,
      });
      throw error;
    }
  }

  static async getUserBusinesses(userId: string): Promise<string[]> {
    const snapshot = await this.db
      .collection("businesses")
      .where("members", "array-contains", userId)
      .get();

    return snapshot.docs.map((doc) => doc.id);
  }

  static async validateUserRole(
    userId: string,
    businessId: string,
    requiredRole: "owner" | "admin" | "member"
  ): Promise<boolean> {
    const businessDoc = await this.db
      .collection("businesses")
      .doc(businessId)
      .get();

    if (!businessDoc.exists) {
      return false;
    }

    const business = businessDoc.data();

    switch (requiredRole) {
      case "owner":
        return business?.owner_id === userId;
      case "admin":
        return (
          business?.owner_id === userId || business?.admins?.includes(userId)
        );
      case "member":
        return (
          business?.owner_id === userId ||
          business?.admins?.includes(userId) ||
          business?.members?.includes(userId)
        );
      default:
        return false;
    }
  }

  static async createBusinessAccess(
    userId: string,
    businessId: string,
    role: "owner" | "admin" | "member"
  ): Promise<void> {
    const businessRef = this.db.collection("businesses").doc(businessId);

    if (role === "owner") {
      await businessRef.update({
        owner_id: userId,
        updated_at: new Date(),
      });
    } else {
      const field = role === "admin" ? "admins" : "members";
      const admin = await import("firebase-admin");
      await businessRef.update({
        [field]: admin.firestore.FieldValue.arrayUnion(userId),
        updated_at: new Date(),
      });
    }

    Logger.info("Business access granted", { userId, businessId, role });
  }
}
