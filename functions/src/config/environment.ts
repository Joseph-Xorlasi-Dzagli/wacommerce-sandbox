// config/environment.ts

import { functions } from "firebase-functions";

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
    return process.env.GCLOUD_PROJECT || "default-project";
  }

  static get isDevelopment(): boolean {
    return process.env.NODE_ENV !== "production";
  }
}
