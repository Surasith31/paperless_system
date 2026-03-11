import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getThumbnailPathById } from "@/repositories/fileStorage";

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

    // Get thumbnail path from database
    const thumbnailPath = await getThumbnailPathById(fileId);

    if (!thumbnailPath) {
      return NextResponse.json(
        { error: "Thumbnail not found" },
        { status: 404 }
      );
    }

    // ✅ Redirect to /api/uploads/{thumbnail_path}
    return NextResponse.redirect(
      new URL(`/api/uploads/${thumbnailPath}`, request.url),
      { status: 302 }
    );
  } catch (error) {
    console.error("Error getting thumbnail:", error);
    return NextResponse.json(
      { error: "Failed to get thumbnail" },
      { status: 500 }
    );
  }
}
