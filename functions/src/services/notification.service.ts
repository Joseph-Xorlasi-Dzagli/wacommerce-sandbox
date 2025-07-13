// functions/src/services/notification.service.ts
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { Logger } from "../utils/logger";

export class NotificationService {
  private static get db() {
    return getFirestore();
  }

  static async storeNotificationRecord(data: {
    orderId: string;
    businessId: string;
    notificationType: string;
    message: string;
    deliveryStatus: string;
    messageId?: string;
  }): Promise<string> {
    const notificationDoc = await this.db.collection("notifications").add({
      ...data,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    Logger.info("Notification record stored", {
      notificationId: notificationDoc.id,
      orderId: data.orderId,
    });

    return notificationDoc.id;
  }

  static async updateDeliveryStatus(
    messageId: string,
    status: string,
    timestamp: Date,
    errorInfo?: any
  ): Promise<void> {
    const query = await this.db
      .collection("notifications")
      .where("messageId", "==", messageId)
      .limit(1)
      .get();

    if (!query.empty) {
      await query.docs[0].ref.update({
        deliveryStatus: status,
        deliveryTimestamp: timestamp,
        errorInfo: errorInfo || null,
        updated_at: FieldValue.serverTimestamp(),
      });

      Logger.info("Delivery status updated", { messageId, status });
    }
  }

  static async logAnalytics(
    businessId: string,
    eventType: string,
    data: any
  ): Promise<void> {
    await this.db.collection("analytics").add({
      business_id: businessId,
      event_type: eventType,
      data,
      timestamp: FieldValue.serverTimestamp(),
    });
  }

  static async getNotificationHistory(
    businessId: string,
    orderId?: string,
    limit = 50
  ): Promise<any[]> {
    let query = this.db
      .collection("notifications")
      .where("businessId", "==", businessId);

    if (orderId) {
      query = query.where("orderId", "==", orderId);
    }

    const snapshot = await query
      .orderBy("created_at", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  static async markNotificationAsRead(notificationId: string): Promise<void> {
    await this.db.collection("notifications").doc(notificationId).update({
      read_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  }

  static async getDeliveryStats(
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const snapshot = await this.db
      .collection("notifications")
      .where("businessId", "==", businessId)
      .where("created_at", ">=", startDate)
      .where("created_at", "<=", endDate)
      .get();

    const stats = {
      total: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      read: 0,
    };

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      stats.total++;

      switch (data.deliveryStatus) {
        case "delivered":
          stats.delivered++;
          break;
        case "failed":
          stats.failed++;
          break;
        case "pending":
          stats.pending++;
          break;
      }

      if (data.read_at) {
        stats.read++;
      }
    });

    return stats;
  }
}
