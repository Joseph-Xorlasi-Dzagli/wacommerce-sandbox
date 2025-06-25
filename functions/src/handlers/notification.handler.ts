// functions/src/handlers/notification.handler.ts
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { AuthService } from "../services/auth.service";
import { WhatsAppService } from "../services/whatsapp.service";
import { NotificationService } from "../services/notification.service";
import { Logger } from "../utils/logger";
import { Helpers } from "../utils/helpers";
import {
  SendNotificationRequest,
  SendNotificationResponse,
} from "../types/requests";

export class NotificationHandler {
  private static db = getFirestore();

  static async sendOrderNotification(
    orderId: string,
    businessId: string,
    notificationType: string,
    userId: string,
    customMessage?: string
  ): Promise<SendNotificationResponse> {
    try {
      // Validate access
      await AuthService.validateBusinessAccess(userId, businessId);

      // Get order details
      const orderDoc = await this.db.collection("orders").doc(orderId).get();
      if (!orderDoc.exists) {
        throw new HttpsError("not-found", "Order not found");
      }

      const order = orderDoc.data();
      if (order?.business_id !== businessId) {
        throw new HttpsError(
          "permission-denied",
          "Order belongs to different business"
        );
      }

      // Get WhatsApp config
      const whatsappConfig = await WhatsAppService.getConfig(businessId);

      // Build notification message
      const message =
        customMessage || this.buildNotificationMessage(notificationType, order);

      // Generate notification ID
      const notificationId = Helpers.generateId();

      // Send WhatsApp message
      const messagePayload = {
        type: "text",
        text: { body: message },
      };

      const messageResponse = await WhatsAppService.sendMessage(
        whatsappConfig,
        order.customer.whatsapp_number || order.customer.phone,
        messagePayload
      );

      // Store notification record
      await NotificationService.storeNotificationRecord({
        orderId,
        businessId,
        notificationType,
        message,
        messageId: messageResponse.messages?.[0]?.id,
        deliveryStatus: "sent",
      });

      // Update order
      await orderDoc.ref.update({
        last_notification_sent: FieldValue.serverTimestamp(),
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

      throw new HttpsError(
        "internal",
        "Notification failed",
        (error as Error).message
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

    // Handle incoming messages
    if (messageData.messages) {
      for (const message of messageData.messages) {
        await this.handleIncomingMessage(message);
      }
    }
  }

  private static async handleIncomingMessage(message: any): Promise<void> {
    try {
      // Store incoming message for future processing
      await this.db.collection("incoming_messages").add({
        whatsapp_message_id: message.id,
        from: message.from,
        type: message.type,
        content: message.text?.body || message.image?.caption || "",
        timestamp: new Date(message.timestamp * 1000),
        processed: false,
        created_at: FieldValue.serverTimestamp(),
      });

      Logger.info("Incoming message stored", {
        messageId: message.id,
        from: message.from,
        type: message.type,
      });
    } catch (error) {
      Logger.error("Failed to handle incoming message", error, {
        messageId: message.id,
      });
    }
  }

  private static buildNotificationMessage(
    notificationType: string,
    order: any
  ): string {
    const customerName = order.customer?.name || "Customer";
    const orderId = order.id;
    const total = Helpers.formatCurrency(order.total);

    switch (notificationType) {
      case "status_change":
        return `Hi ${customerName}! Your order #${orderId} status has been updated to: ${order.status}. Total: ${total}`;

      case "payment_received":
        return `Hi ${customerName}! We've received your payment for order #${orderId}. Total: ${total}. Thank you!`;

      case "shipping_update":
        return `Hi ${customerName}! Your order #${orderId} is now being shipped. You'll receive tracking details soon. Total: ${total}`;

      case "order_confirmed":
        return `Hi ${customerName}! Your order #${orderId} has been confirmed. Total: ${total}. We'll keep you updated on the progress.`;

      case "order_delivered":
        return `Hi ${customerName}! Your order #${orderId} has been delivered. Total: ${total}. Thank you for your business!`;

      default:
        return `Hi ${customerName}! There's an update on your order #${orderId}. Total: ${total}`;
    }
  }

  static async getNotificationHistory(
    businessId: string,
    userId: string,
    orderId?: string
  ): Promise<any[]> {
    try {
      await AuthService.validateBusinessAccess(userId, businessId);

      return await NotificationService.getNotificationHistory(
        businessId,
        orderId
      );
    } catch (error) {
      Logger.error("Failed to get notification history", error, {
        businessId,
        orderId,
      });
      throw new HttpsError(
        "internal",
        "Failed to get notification history",
        (error as Error).message
      );
    }
  }

  static async getDeliveryStats(
    businessId: string,
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    try {
      await AuthService.validateBusinessAccess(userId, businessId);

      return await NotificationService.getDeliveryStats(
        businessId,
        startDate,
        endDate
      );
    } catch (error) {
      Logger.error("Failed to get delivery stats", error, {
        businessId,
      });
      throw new HttpsError(
        "internal",
        "Failed to get delivery stats",
        (error as Error).message
      );
    }
  }

  static async sendBulkNotifications(
    businessId: string,
    userId: string,
    orderIds: string[],
    notificationType: string,
    customMessage?: string
  ): Promise<any> {
    try {
      await AuthService.validateBusinessAccess(userId, businessId);

      const results = {
        total: orderIds.length,
        successful: 0,
        failed: 0,
        errors: [] as any[],
      };

      // Process in batches to avoid overwhelming the API
      const batches = Helpers.chunkArray(orderIds, 5);

      for (const batch of batches) {
        const batchPromises = batch.map(async (orderId) => {
          try {
            await this.sendOrderNotification(
              orderId,
              businessId,
              notificationType,
              userId,
              customMessage
            );
            results.successful++;
          } catch (error) {
            results.failed++;
            results.errors.push({
              orderId,
              error: (error as Error).message,
            });
          }
        });

        await Promise.all(batchPromises);

        // Add delay between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await Helpers.delay(1000);
        }
      }

      Logger.info("Bulk notifications completed", results);
      return results;
    } catch (error) {
      Logger.error("Bulk notifications failed", error, { businessId });
      throw new HttpsError(
        "internal",
        "Bulk notifications failed",
        (error as Error).message
      );
    }
  }
}
