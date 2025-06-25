// functions/src/types/requests.ts

export interface SyncCatalogRequest {
  businessId: string;
  syncType: "full" | "incremental" | "specific";
  productIds?: string[];
  includeCategories?: boolean;
}

export interface UploadMediaRequest {
  businessId: string;
  imageUrl: string;
  purpose: "product" | "category" | "carousel" | "fallback";
  referenceId: string;
  referenceType: "products" | "categories";
}

export interface SendNotificationRequest {
  businessId: string;
  orderId: string;
  notificationType:
    | "status_change"
    | "payment_received"
    | "shipping_update"
    | "order_confirmed"
    | "order_delivered";
  customMessage?: string;
}

export interface SyncInventoryRequest {
  businessId: string;
  productIds?: string[];
  updatePrices?: boolean;
}

export interface BatchUploadMediaRequest {
  businessId: string;
  productIds?: string[];
}

export interface RefreshMediaRequest {
  businessId: string;
  bufferDays?: number;
}

export interface CleanupMediaRequest {
  businessId: string;
  olderThanDays?: number;
}

export interface BulkNotificationRequest {
  businessId: string;
  orderIds: string[];
  notificationType: string;
  customMessage?: string;
}

export interface GetNotificationHistoryRequest {
  businessId: string;
  orderId?: string;
  limit?: number;
}

export interface GetDeliveryStatsRequest {
  businessId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

// Response interfaces for better type safety
export interface UploadMediaResponse {
  success: boolean;
  whatsappMediaId?: string;
  mediaDocId?: string;
  message?: string;
  error?: string;
}

export interface SendNotificationResponse {
  success: boolean;
  notificationId?: string;
  messageId?: string;
  message?: string;
  error?: string;
}
