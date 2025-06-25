// utils/helpers.ts

export class Helpers {
  static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static formatCurrency(amount: number, currency = "GHS"): string {
    return `${currency} ${amount.toFixed(2)}`;
  }

  static formatPhoneNumber(phone: string): string {
    // Remove all non-digits and ensure it starts with country code
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.startsWith("233") ? cleaned : `233${cleaned}`;
  }

  static generateOrderRef(orderId: string): string {
    return orderId.slice(-6).toUpperCase();
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static retryAsync<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    delay: number = 1000
  ): Promise<T> {
    return fn().catch(async (error) => {
      if (maxRetries <= 0) throw error;

      await this.delay(delay);
      return this.retryAsync(fn, maxRetries - 1, delay * 2);
    });
  }
}
