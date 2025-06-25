// functions/src/utils/helpers.ts
export class Helpers {
  static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static sanitizePhoneNumber(phone: string): string {
    // Remove all non-digits and ensure proper Ghana format
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("233")) {
      return cleaned;
    }
    if (cleaned.startsWith("0")) {
      return "233" + cleaned.substring(1);
    }
    return "233" + cleaned;
  }

  static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  static validateBusinessId(businessId: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(businessId) && businessId.length > 0;
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static formatCurrency(amount: number, currency = "GHS"): string {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
    }).format(amount);
  }

  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  }
}
