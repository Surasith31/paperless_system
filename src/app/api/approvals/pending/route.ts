// ================================================================
// 📋 API: Get Pending Approvals
// ================================================================
// GET /api/approvals/pending
// Manager ดูรายการเอกสารที่รออนุมัติ
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { ROLES } from "@/repositories/users";
import { getPendingApprovals } from "@/repositories/workflow";

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
        { error: "เฉพาะ Manager เท่านั้นที่สามารถดูเอกสารรออนุมัติได้" },
        { status: 403 }
      );
    }

    // ดึงรายการเอกสารที่รออนุมัติ
    const documents = await getPendingApprovals(user.userId);

    return NextResponse.json({
      success: true,
      documents: documents,
      count: documents.length,
    });
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลเอกสารรออนุมัติ" },
      { status: 500 }
    );
  }
}
