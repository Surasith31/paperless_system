// ================================================================
// Error Tracking & Logging Utility
// ================================================================
// ใช้สำหรับจัดการและส่ง errors ไปยัง monitoring service
// ================================================================

import { ErrorContext, ErrorLog } from "@/models/error";


class ErrorTracker {
  private static instance: ErrorTracker;
  private errorLogs: ErrorLog[] = [];
  private maxLogs = 100;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  /**
   * Log error to console and optionally send to external service
   */
  logError(
    error: Error | string,
    level: "error" | "warn" | "info" = "error",
    context?: ErrorContext
  ): void {
    const errorLog: ErrorLog = {
      message: typeof error === "string" ? error : error.message,
      stack: typeof error === "string" ? undefined : error.stack,
      timestamp: new Date().toISOString(),
      level,
      context,
      digest:
        typeof error === "object" && "digest" in error
          ? (error as Error & { digest?: string }).digest
          : undefined,
    };

    // Add to in-memory logs
    this.errorLogs.push(errorLog);
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs.shift();
    }

    // Log to console
    if (level === "error") {
      console.error("[Error Tracker]", errorLog);
    } else if (level === "warn") {
      console.warn("[Error Tracker]", errorLog);
    } else {
      console.info("[Error Tracker]", errorLog);
    }

  }

  /**
   * Get all error logs (for debugging)
   */
  getLogs(): ErrorLog[] {
    return [...this.errorLogs];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.errorLogs = [];
  }
}

// Export singleton instance
export const errorTracker = ErrorTracker.getInstance();

/**
 * Helper function to track errors with context
 */
export function trackError(
  error: Error | string,
  context?: ErrorContext
): void {
  errorTracker.logError(error, "error", context);
}

/**
 * Helper function to track warnings
 */
export function trackWarning(message: string, context?: ErrorContext): void {
  errorTracker.logError(message, "warn", context);
}

/**
 * Helper function to track info
 */
export function trackInfo(message: string, context?: ErrorContext): void {
  errorTracker.logError(message, "info", context);
}
