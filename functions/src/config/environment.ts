// config/environment.ts

import * as functions from "firebase-functions";

export class Environment {
  static get whatsappWebhookSecret(): string {
    return functions.config().whatsapp?.webhook_secret || "default_secret";
  }

  static get encryptionKey(): string {
    return (
      functions.config().encryption?.key || "default_key_32_chars_minimum!"
    );
  }

  static get storageBucket(): string {
    return functions.config().storage?.bucket || "default-bucket";
  }

  static get projectId(): string {
    return process.env.GCLOUD_PROJECT || "apsel-c9e99";
  }

  static get isDevelopment(): boolean {
    return process.env.NODE_ENV !== "production";
  }
}
