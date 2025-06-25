// functions/src/utils/logger.ts
import { logger } from "firebase-functions/v2";

export class Logger {
  static info(message: string, data?: any): void {
    logger.info(message, data);
  }

  static error(message: string, error?: any, data?: any): void {
    logger.error(message, { error: error?.message || error, data });
  }

  static warn(message: string, data?: any): void {
    logger.warn(message, data);
  }

  static debug(message: string, data?: any): void {
    logger.debug(message, data);
  }
}
