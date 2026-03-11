import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";

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
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการออกจากระบบ" },
      { status: 500 }
    );
  }
}
