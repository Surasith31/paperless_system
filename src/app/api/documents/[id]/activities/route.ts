import { NextRequest, NextResponse } from "next/server";
import { getDocumentActivities } from "@/repositories/activities";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentId = parseInt(id);

    if (isNaN(documentId)) {
      return NextResponse.json(
        { success: false, message: "Invalid document ID" },
        { status: 400 }
      );
    }

    // รับ query parameters สำหรับ filtering
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const actionType = searchParams.get("action_type");

    // ดึง activities ทั้งหมด
    let activities = await getDocumentActivities(documentId);

    // Filter by user_id ถ้ามี
    if (userId) {
      const userIdNum = parseInt(userId);
      if (!isNaN(userIdNum)) {
        activities = activities.filter((a) => a.user_id === userIdNum);
      }
    }

    // Filter by action_type ถ้ามี
    if (actionType) {
      activities = activities.filter((a) => a.action === actionType);
    }

    return NextResponse.json({
      success: true,
      activities,
      total: activities.length,
    });
  } catch (error) {
    console.error("Get document activities error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to get activities",
      },
      { status: 500 }
    );
  }
}
