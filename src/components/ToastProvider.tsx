"use client";

import { createContext, useContext, useState, useCallback } from "react";
import Toast, { ToastProps } from "./Toast";

interface ToastContextType {
  showToast: (
    type: ToastProps["type"],
    message: string,
    description?: string,
    duration?: number
  ) => void;
  showSuccess: (message: string, description?: string) => void;
  showError: (message: string, description?: string) => void;
  showWarning: (message: string, description?: string) => void;
  showInfo: (message: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = useCallback(
    (
      type: ToastProps["type"],
      message: string,
      description?: string,
      duration = 5000
    ) => {
      const id = Math.random().toString(36).substring(7);
      const newToast: ToastProps = {
        id,
        type,
        message,
        description,
        duration,
        onClose: (toastId) => {
          setToasts((prev) => prev.filter((t) => t.id !== toastId));
        },
      };

      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const showSuccess = useCallback(
    (message: string, description?: string) => {
      showToast("success", message, description);
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, description?: string) => {
      showToast("error", message, description);
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, description?: string) => {
      showToast("warning", message, description);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, description?: string) => {
      showToast("info", message, description);
    },
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{ showToast, showSuccess, showError, showWarning, showInfo }}
    >
      {children}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
