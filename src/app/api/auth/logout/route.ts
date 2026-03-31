import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";
import { trackError } from "@/lib/errorTracking";

export async function POST() {
  try {
    // สร้าง response
    const response = NextResponse.json({
      success: true,
      message: "ออกจากระบบสำเร็จ",
    });

    // ลบ auth cookie
    clearAuthCookie(response);

    return response;
  } catch (error) {
    trackError(error instanceof Error ? error : new Error(String(error)), {
      url: "/api/auth/logout",
      action: "logout",
    });
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการออกจากระบบ" },
      { status: 500 }
    );
  }
}
