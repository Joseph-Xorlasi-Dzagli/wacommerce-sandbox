// functions/src/utils/encryption.ts
import * as crypto from "crypto";
import { defineSecret } from "firebase-functions/params";

const encryptionKey = defineSecret("ENCRYPTION_KEY");

export class Encryption {
  private static algorithm = "aes-256-gcm";

  static encrypt(text: string): string {
    if (!encryptionKey.value()) {
      throw new Error("Encryption key not configured");
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      Buffer.from(encryptionKey.value(), "utf8"),
      iv
    );

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = (cipher as any).getAuthTag();

    return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
  }

  static decrypt(encryptedText: string): string {
    if (!encryptionKey.value()) {
      throw new Error("Encryption key not configured");
    }

    const parts = encryptedText.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted text format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      Buffer.from(encryptionKey.value(), "utf8"),
      iv
    );
    (decipher as any).setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  static hash(text: string): string {
    return crypto.createHash("sha256").update(text).digest("hex");
  }

  static generateSecureToken(length = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }

  static compareHash(text: string, hash: string): boolean {
    return this.hash(text) === hash;
  }
}
