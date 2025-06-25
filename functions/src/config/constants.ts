// config/constants.ts

export const APP_CONFIG = {
  WHATSAPP: {
    API_VERSION: "v18.0",
    BASE_URL: "https://graph.facebook.com",
    BATCH_SIZE: 10,
    MEDIA_EXPIRES_DAYS: 30,
    MAX_RETRIES: 3,
  },
  FUNCTIONS: {
    REGION: "us-central1",
    MEMORY: {
      SMALL: "256MB",
      MEDIUM: "512MB",
      LARGE: "1GB",
      XLARGE: "2GB",
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
    },
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
} as const;
