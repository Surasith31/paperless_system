// ================================================================
// 📋 API: Get Engineers List
// ================================================================
// GET /api/users/engineers
// ดึงรายชื่อ Engineer ทั้งหมด (สำหรับ Manager เลือก Engineer)
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getEngineersList, ROLES } from "@/repositories/users";

export async function GET(req: NextRequest) {
  try {
    // ตรวจสอบ authentication
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    // ตรวจสอบว่าเป็น Manager หรือไม่
    if (user.role !== ROLES.Manager) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้" },
        { status: 403 }
      );
    }

    // ดึงรายชื่อ Engineer
    const engineers = await getEngineersList();

    return NextResponse.json({
      success: true,
      engineers,
    });
  } catch (error) {
    console.error("Error fetching engineers:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูล Engineer" },
      { status: 500 }
    );
  }
}
