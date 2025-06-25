// types/requests.ts

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
  notificationType: "status_change" | "payment_received" | "shipping_update";
  customMessage?: string;
}

export interface SyncInventoryRequest {
  businessId: string;
  productIds?: string[];
  updatePrices?: boolean;
}
