import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getMyDocuments } from "@/repositories/documents";

export async function GET(req: NextRequest) {
  try {
    // ตรวจสอบ authentication
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "กรุณาเข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    // ดึงเอกสารทั้งหมดที่ user นี้สร้าง
    const documents = await getMyDocuments(user.userId);

    return NextResponse.json({
      success: true,
      documents,
      total: documents.length,
    });
  } catch (error) {
    console.error("Get my documents error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to get documents",
      },
      { status: 500 }
    );
  }
}
