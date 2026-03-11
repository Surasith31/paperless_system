export interface ErrorContext {
  userId?: number;
  userEmail?: string;
  userRole?: number;
  url?: string;
  component?: string;
  action?: string;
  [key: string]: unknown;
}

export interface ErrorLog {
  message: string;
  stack?: string;
  timestamp: string;
  level: "error" | "warn" | "info";
  context?: ErrorContext;
  digest?: string;
}