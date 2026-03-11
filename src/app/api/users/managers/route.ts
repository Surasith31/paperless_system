// ================================================================
// 📋 API: Get Managers List
// ================================================================
// GET /api/users/managers
// ดึงรายชื่อ Manager ทั้งหมด (สำหรับ Sell เลือก Manager)
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getManagersList, ROLES } from "@/repositories/users";

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

    // ตรวจสอบว่าเป็น Sell หรือไม่ (เฉพาะ Sell ที่ต้องเลือก Manager)
    if (user.role !== ROLES.Sell) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้" },
        { status: 403 }
      );
    }

    // ดึงรายชื่อ Manager
    const managers = await getManagersList();

    return NextResponse.json({
      success: true,
      managers,
    });
  } catch (error) {
    console.error("Error fetching managers:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูล Manager" },
      { status: 500 }
    );
  }
}
