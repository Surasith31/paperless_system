"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

interface AlertProps {
  type?: "success" | "error" | "warning" | "info";
  message: string;
  onClose?: () => void;
  autoDismiss?: boolean;
  dismissTimeout?: number;
  className?: string;
}

export default function Alert({
  type = "error",
  message,
  onClose,
  autoDismiss = true,
  dismissTimeout = 5000,
  className = "",
}: AlertProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 10);

    if (autoDismiss) {
      const timer = setTimeout(() => {
        handleClose();
      }, dismissTimeout);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [autoDismiss, dismissTimeout, handleClose]);

  const config = {
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      icon: CheckCircle,
      iconColor: "text-green-500",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: XCircle,
      iconColor: "text-red-500",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-800",
      icon: AlertTriangle,
      iconColor: "text-yellow-500",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      icon: Info,
      iconColor: "text-blue-500",
    },
  };

  const { bg, border, text, icon: Icon, iconColor } = config[type];

  return (
    <div
      className={`
    fixed top-4 left-1/2 transform -translate-x-1/2
    ${bg} ${border} ${text}
    border-l-4 rounded-lg shadow-lg
    px-4 py-3 mb-4
    flex items-start gap-3
    transition-all duration-300 ease-out
    ${
      isVisible && !isExiting
        ? "opacity-100 translate-y-0"
        : "-translate-y-20 opacity-0"
    }
    ${className}
  `}
      role="alert"
    >
      <Icon className={`${iconColor} w-5 h-5 flex-shrink-0 mt-0.5`} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{message}</p>
      </div>

      <button
        onClick={handleClose}
        className={`${text} hover:opacity-70 transition-opacity flex-shrink-0`}
        aria-label="Close alert"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
