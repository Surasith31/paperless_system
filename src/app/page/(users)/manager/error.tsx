"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { trackError } from "@/lib/errorTracking";

export default function ManagerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    trackError(error, {
      component: "ManagerPage",
      url: window.location.href,
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
          เกิดข้อผิดพลาดในการอนุมัติเอกสาร
        </h2>

        <p className="text-gray-600 text-center mb-6">
          ไม่สามารถโหลดหน้าอนุมัติเอกสารได้ กรุณาลองใหม่อีกครั้ง
        </p>

        {process.env.NODE_ENV === "development" && (
          <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-xs font-mono text-red-800 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            ลองใหม่
          </button>

          <button
            onClick={() => router.push("/page/dashboard")}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    </div>
  );
}
