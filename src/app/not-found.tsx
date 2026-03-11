import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <FileQuestion className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        {/* 404 Text */}
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          ไม่พบหน้าที่ค้นหา
        </h2>

        {/* Description */}
        <p className="text-gray-600 mb-8">ขออภัย ไม่พบหน้าที่คุณกำลังมองหา</p>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Home Button */}
          <Link
            href="/page/login"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Home className="w-5 h-5" />
            กลับหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}
