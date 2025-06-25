import { NotificationService } from "@/services/notification.service";
import {
  SendNotificationRequest,
  SendNotificationResponse,
} from "../types/requests";

export class NotificationHandler {
  private static db = firestore();

  static async sendOrderNotification(
    request: SendNotificationRequest,
    userId: string
  ): Promise<SendNotificationResponse> {
    const { businessId, orderId, notificationType, customMessage } = request;

    try {
      await AuthService.validateBusinessAccess(userId, businessId);

      // Get order details
      const orderDoc = await this.db.collection("orders").doc(orderId).get();
      if (!orderDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Order not found");
      }

      const order = orderDoc.data();
      if (order?.business_id !== businessId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Order does not belong to business"
        );
      }

      // Check if notifications are enabled
      const businessSettings = await NotificationService.getBusinessSettings(
        businessId
      );
      if (!businessSettings.notifications?.order_updates) {
        return {
          success: false,
          message: "Order notifications are disabled for this business",
        };
      }

      // Get customer WhatsApp number
      const customerNumber =
        order.customer?.whatsapp_number || order.customer?.phone;
      if (!customerNumber) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Customer WhatsApp number not available"
        );
      }

      // Build message
      const messageContent = await NotificationService.buildOrderMessage(
        businessId,
        order,
        notificationType,
        customMessage
      );

      // Send message
      const whatsappConfig = await WhatsAppService.getConfig(businessId);
      const messageResponse = await WhatsAppService.sendMessage(
        whatsappConfig,
        customerNumber,
        messageContent
      );

      // Store notification record
      const notificationId = await NotificationService.storeNotificationRecord({
        orderId,
        businessId,
        customerId: order.customer?.id,
        notificationType,
        message: messageContent.text || messageContent.template?.name,
        whatsappMessageId: messageResponse.messages?.[0]?.id,
        deliveryStatus: "sent",
      });

      // Update order
      await orderDoc.ref.update({
        last_notification_sent: firestore.FieldValue.serverTimestamp(),
        last_notification_type: notificationType,
      });

      // Log analytics
      await NotificationService.logAnalytics(businessId, "notification_sent", {
        notification_type: notificationType,
        order_id: orderId,
        channel: "whatsapp",
      });

      Logger.info("Order notification sent successfully", {
        orderId,
        notificationType,
        messageId: messageResponse.messages?.[0]?.id,
      });

      return {
        success: true,
        notificationId,
        messageId: messageResponse.messages?.[0]?.id,
        message: "Notification sent successfully",
      };
    } catch (error) {
      Logger.error("Order notification failed", error, {
        orderId,
        notificationType,
      });

      // Store failed notification
      await NotificationService.storeNotificationRecord({
        orderId,
        businessId,
        notificationType,
        message: "Failed to send",
        deliveryStatus: "failed",
      });

      throw new functions.https.HttpsError(
        "internal",
        "Notification failed",
        error.message
      );
    }
  }

  static async handleDeliveryStatus(
    messageId: string,
    status: string,
    timestamp: Date,
    errorInfo?: any
  ): Promise<void> {
    try {
      await NotificationService.updateDeliveryStatus(
        messageId,
        status,
        timestamp,
        errorInfo
      );

      Logger.info("Delivery status updated", { messageId, status });
    } catch (error) {
      Logger.error("Failed to handle delivery status", error, {
        messageId,
        status,
      });
    }
  }

  static async processWebhook(webhookData: any): Promise<void> {
    try {
      if (webhookData.object === "whatsapp_business_account") {
        for (const entry of webhookData.entry || []) {
          for (const change of entry.changes || []) {
            if (change.field === "messages") {
              await this.processMessageUpdate(change.value);
            }
          }
        }
      }
    } catch (error) {
      Logger.error("Webhook processing failed", error);
    }
  }

  private static async processMessageUpdate(messageData: any): Promise<void> {
    // Handle status updates
    if (messageData.statuses) {
      for (const status of messageData.statuses) {
        await this.handleDeliveryStatus(
          status.id,
          status.status,
          new Date(status.timestamp * 1000),
          status.errors?.[0]
        );
      }
    }

    // Handle incoming messages (for analytics)
    if (messageData.messages) {
      for (const message of messageData.messages) {
        await NotificationService.logAnalytics("system", "message_received", {
          from: message.from,
          type: message.type,
          timestamp: new Date(message.timestamp * 1000),
        });
      }
    }
  }
}
