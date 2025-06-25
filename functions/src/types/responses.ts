// types/responses.ts

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
