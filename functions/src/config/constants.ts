// functions/src/config/constants.ts

export const APP_CONFIG = {
  WHATSAPP: {
    API_VERSION: "v18.0",
    BASE_URL: "https://graph.facebook.com",
    BATCH_SIZE: 10,
    MEDIA_EXPIRES_DAYS: 30,
    MAX_RETRIES: 3,
    RATE_LIMIT: {
      MESSAGES_PER_SECOND: 20,
      CATALOG_OPERATIONS_PER_MINUTE: 100,
    },
  },
  FUNCTIONS: {
    REGION: "us-central1",
    MEMORY: {
      SMALL: "256MiB" as const,
      MEDIUM: "512MiB" as const,
      LARGE: "1GiB" as const,
      XLARGE: "2GiB" as const,
    },
    TIMEOUT: {
      SHORT: 60,
      MEDIUM: 300,
      LONG: 540,
    },
  },
  IMAGE: {
    MAX_SIZE_MB: 16,
    QUALITY: 85,
    FORMATS: {
      PRODUCT: { width: 800, height: 800 },
      CAROUSEL: { width: 1080, height: 1080 },
      THUMBNAIL: { width: 300, height: 300 },
      CATEGORY: { width: 600, height: 600 },
    },
  },
  BUSINESS: {
    MAX_PRODUCTS_PER_CATALOG: 10000,
    MAX_MEDIA_FILES_PER_BUSINESS: 1000,
  },
  NOTIFICATION: {
    MAX_MESSAGE_LENGTH: 4096,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
  },
} as const;

export const ERROR_CODES = {
  AUTH_REQUIRED: "auth-required",
  BUSINESS_NOT_FOUND: "business-not-found",
  WHATSAPP_NOT_CONFIGURED: "whatsapp-not-configured",
  INVALID_REQUEST: "invalid-request",
  SYNC_FAILED: "sync-failed",
  MEDIA_UPLOAD_FAILED: "media-upload-failed",
  NOTIFICATION_FAILED: "notification-failed",
  RATE_LIMIT_EXCEEDED: "rate-limit-exceeded",
  INSUFFICIENT_PERMISSIONS: "insufficient-permissions",
  PRODUCT_NOT_FOUND: "product-not-found",
  ORDER_NOT_FOUND: "order-not-found",
  MEDIA_NOT_FOUND: "media-not-found",
} as const;

export const COLLECTIONS = {
  BUSINESSES: "businesses",
  PRODUCTS: "products",
  ORDERS: "orders",
  WHATSAPP_CONFIGS: "whatsapp_configs",
  WHATSAPP_MEDIA: "whatsapp_media",
  NOTIFICATIONS: "notifications",
  ANALYTICS: "analytics",
  INCOMING_MESSAGES: "incoming_messages",
} as const;

export const NOTIFICATION_TYPES = {
  STATUS_CHANGE: "status_change",
  PAYMENT_RECEIVED: "payment_received",
  SHIPPING_UPDATE: "shipping_update",
  ORDER_CONFIRMED: "order_confirmed",
  ORDER_DELIVERED: "order_delivered",
  ORDER_CANCELLED: "order_cancelled",
} as const;

export const SYNC_TYPES = {
  FULL: "full",
  INCREMENTAL: "incremental",
  SPECIFIC: "specific",
} as const;

export const MEDIA_PURPOSES = {
  PRODUCT: "product",
  CATEGORY: "category",
  CAROUSEL: "carousel",
  FALLBACK: "fallback",
} as const;
