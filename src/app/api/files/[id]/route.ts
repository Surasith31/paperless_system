import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getFilePathById } from "@/repositories/fileStorage";

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

    const filePath = await getFilePathById(fileId);

    if (!filePath) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // ✅ Redirect ไปที่ /api/uploads/{file_path}
    const host =
      request.headers.get("x-forwarded-host") || request.nextUrl.host;
    const protocol =
      request.headers.get("x-forwarded-proto") ||
      request.nextUrl.protocol.replace(":", "");
    const absoluteUrl = `${protocol}://${host}/api/uploads/${filePath}`;

    return NextResponse.redirect(absoluteUrl, { status: 302 });
  } catch (error) {
    console.error("🔥 File API Error:", error);
    return NextResponse.json({ error: "Failed to get file" }, { status: 500 });
  }
}
