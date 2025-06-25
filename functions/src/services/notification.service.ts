// services/notification.service.ts

import { firestore } from 'firebase-admin';
import { Logger } from '../utils/logger';

export class NotificationService {
  private static db = firestore();

  static async buildOrderMessage(
    businessId: string,
    order: any,
    notificationType: string,
    customMessage?: string
  ): Promise<any> {
    if (customMessage) {
      return {
        type: 'text',
        text: customMessage
      };
    }

    // Get business info for personalization
    const businessDoc = await this.db.collection('businesses').doc(businessId).get();
    const businessName = businessDoc.data()?.name || 'We';
    const orderRef = order.id?.slice(-6).toUpperCase();

    let messageText = '';

    switch (notificationType) {
      case 'status_change':
        messageText = `Hi ${order.customer?.name || 'there'}! Your order #${orderRef} status has been updated to: ${order.status}. ${businessName} will keep you informed of any changes.`;
        break;
        
      case 'payment_received':
        messageText = `Thank you ${order.customer?.name || ''}! We've received your payment of GHS ${order.total} for order #${orderRef}. Your order is now being processed.`;
        break;
        
      case 'shipping_update':
        messageText = `Your order #${orderRef} is on its way! ${order.tracking_number ? `Tracking: ${order.tracking_number}` : 'We\'ll update you when it\'s delivered.'}`;
        break;
        
      default:
        messageText = `Hi ${order.customer?.name || 'there'}! We have an update about your order #${orderRef}. Please contact us if you have any questions.`;
    }

    return {
      type: 'text',
      text: messageText
    };
  }

  static async storeNotificationRecord(data: {
    orderId: string;
    businessId: string;
    customerId?: string;
    notificationType: string;
    message: string;
    whatsappMessageId?: string;
    deliveryStatus?: string;
  }): Promise<string> {
    const notificationDoc = await this.db.collection('order_notifications').add({
      order_id: data.orderId,
      customer_id: data.customerId || null,
      business_id: data.businessId,
      type: data.notificationType,
      channel: 'whatsapp',
      message: data.message,
      delivery_status: data.deliveryStatus || 'sent',
      whatsapp_message_id: data.whatsappMessageId || null,
      is_read: false,
      created_at: firestore.FieldValue.serverTimestamp()
    });

    Logger.info('Notification record stored', {
      notificationId: notificationDoc.id,
      orderId: data.orderId,
      type: data.notificationType
    });

    return notificationDoc.id;
  }

  static async updateDeliveryStatus(
    messageId: string,
    status: string,
    timestamp: Date,
    errorInfo?: { code?: string; message?: string }
  ): Promise<void> {
    const notificationSnapshot = await this.db.collection('order_notifications')
      .where('whatsapp_message_id', '==', messageId)
      .limit(1)
      .get();

    if (notificationSnapshot.empty) {
      Logger.warn('Notification not found for message ID', { messageId });
      return;
    }

    const notificationDoc = notificationSnapshot.docs[0];
    const updateData: any = {
      delivery_status: status,
      status_updated_at: timestamp
    };

    if (status === 'read') {
      updateData.is_read = true;
      updateData.read_at = timestamp;
    }

    if (status === 'failed' && errorInfo) {
      updateData.error_code = errorInfo.code;
      updateData.error_message = errorInfo.message;
    }

    await notificationDoc.ref.update(updateData);

    Logger.info('Delivery status updated', {
      notificationId: notificationDoc.id,
      messageId,
      status
    });
  }

  static async logAnalytics(businessId: string, eventType: string, metadata: any): Promise<void> {
    await this.db.collection('whatsapp_analytics').add({
      business_id: businessId,
      event_type: eventType,
      metadata,
      created_at: firestore.FieldValue.serverTimestamp()
    });
  }

  static async getBusinessSettings(businessId: string): Promise<any> {
    const settingsDoc = await this.db.collection('business_settings').doc(businessId).get();
    
    if (settingsDoc.exists) {
      return settingsDoc.data();
    }

    // Return default settings
    return {
      notifications: {
        order_updates: true,
        low_stock_alerts: true,
        daily_summary: false
      },
      whatsapp: {
        greeting_message: 'Hello! Welcome to our store.',
        auto_reply_enabled: true,
        default_language: 'en'
      }
    };
  }
}