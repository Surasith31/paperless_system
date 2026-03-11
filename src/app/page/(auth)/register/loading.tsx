import { Loader2 } from "lucide-react";

export default function RegisterLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          กำลังโหลดหน้าสมัครสมาชิก
        </h2>
        <p className="text-gray-600">กรุณารอสักครู่...</p>
      </div>
    </div>
  );
}
