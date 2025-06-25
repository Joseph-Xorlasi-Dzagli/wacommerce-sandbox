// utils/encryption.ts

import * as crypto from "crypto";
import { Environment } from "../config/environment";

export class Encryption {
  private static readonly algorithm = "aes-256-cbc";

  static encrypt(data: string): string {
    const key = Buffer.from(Environment.encryptionKey, "utf8").slice(0, 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");

    return iv.toString("hex") + encrypted;
  }

  static decrypt(encryptedData: string): string {
    const key = Buffer.from(Environment.encryptionKey, "utf8").slice(0, 32);
    const iv = Buffer.from(encryptedData.slice(0, 32), "hex");
    const encrypted = encryptedData.slice(32);

    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}
