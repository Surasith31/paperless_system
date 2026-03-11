// ================================================================
// 📋 API: Get Assigned Documents
// ================================================================
// GET /api/documents/assigned
// Engineer ดูรายการงานที่ได้รับมอบหมาย
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { ROLES } from "@/repositories/users";
import { getAssignedDocuments } from "@/repositories/workflow";

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

    // ตรวจสอบว่าเป็น Engineer หรือไม่
    if (user.role !== ROLES.Engineer) {
      return NextResponse.json(
        { error: "เฉพาะ Engineer เท่านั้นที่สามารถดูงานที่ได้รับมอบหมายได้" },
        { status: 403 }
      );
    }

    // ดึงรายการงานที่ได้รับมอบหมาย
    const documents = await getAssignedDocuments(user.userId);

    return NextResponse.json({
      success: true,
      documents: documents,
      count: documents.length,
    });
  } catch (error) {
    console.error("Error fetching assigned documents:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลงาน" },
      { status: 500 }
    );
  }
}
