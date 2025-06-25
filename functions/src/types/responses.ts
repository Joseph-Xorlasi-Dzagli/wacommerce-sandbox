// functions/src/types/responses.ts

export interface BaseResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface SyncCatalogResponse extends BaseResponse {
  syncedProducts: number;
  failedProducts: number;
  errors: Array<{ productId: string; error: string }>;
}

export interface UploadMediaResponse extends BaseResponse {
  whatsappMediaId?: string;
  mediaDocId?: string;
}

export interface SendNotificationResponse extends BaseResponse {
  notificationId?: string;
  messageId?: string;
}

export interface BatchOperationResponse extends BaseResponse {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export interface MediaStatsResponse extends BaseResponse {
  total: number;
  uploaded: number;
  expired: number;
  failed: number;
  totalSize: number;
  byPurpose: Record<string, number>;
}

export interface DeliveryStatsResponse extends BaseResponse {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  read: number;
  deliveryRate: number;
  readRate: number;
}

export interface NotificationHistoryResponse extends BaseResponse {
  notifications: Array<{
    id: string;
    orderId: string;
    notificationType: string;
    message: string;
    deliveryStatus: string;
    messageId?: string;
    created_at: any;
    delivered_at?: any;
    read_at?: any;
  }>;
  total: number;
}
