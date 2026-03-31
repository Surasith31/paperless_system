import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getFileInfoById } from "@/repositories/fileStorage";
import { logActivity } from "@/repositories/activities";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const fileId = parseInt(id);

    if (isNaN(fileId)) {
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
    }

    const fileInfo = await getFileInfoById(fileId);

    if (!fileInfo) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // บันทึก activity log
    await logActivity(
      user.userId,
      fileInfo.documentId,
      "file_downloaded",
      `ดาวน์โหลดไฟล์ "${fileInfo.fileName}"`,
      { file_id: fileId, file_name: fileInfo.fileName }
    );

    // Redirect ไปที่ /api/uploads/{file_path}
    const host =
      request.headers.get("x-forwarded-host") || request.nextUrl.host;
    const protocol =
      request.headers.get("x-forwarded-proto") ||
      request.nextUrl.protocol.replace(":", "");
    const absoluteUrl = `${protocol}://${host}/api/uploads/${fileInfo.filePath}`;

    return NextResponse.redirect(absoluteUrl, { status: 302 });
  } catch (error) {
    console.error("File API Error:", error);
    return NextResponse.json({ error: "Failed to get file" }, { status: 500 });
  }
}
