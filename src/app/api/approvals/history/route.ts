import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getApprovalHistory } from "@/repositories/workflow";

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

    // ดึงประวัติการอนุมัติทั้งหมด
    const history = await getApprovalHistory(user.userId);

    return NextResponse.json({
      success: true,
      approvals: history,
      total: history.length,
    });
  } catch (error) {
    console.error("Get approval history error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to get approval history",
      },
      { status: 500 }
    );
  }
}
