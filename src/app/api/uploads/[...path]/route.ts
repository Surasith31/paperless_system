import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { checkUserAccessToDocument } from "@/repositories/documents";
import { UPLOAD_DIR } from "@/lib/env";
import fs from "fs/promises";
import path from "path";
import { trackError } from "@/lib/errorTracking";

const uploadsDir = UPLOAD_DIR;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    // ✅ เช็ค Authentication
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path: filePath } = await params;
    const filePathStr = filePath.join("/");

    // ✅ เช็ค Permission - ดึง document_id จาก path (format: doc_26_0_filename)
    const match = filePathStr.match(/doc_(\d+)_/);
    if (match) {
      const documentId = parseInt(String(match[1]));
      const hasAccess = await checkUserAccessToDocument(
        user.userId,
        documentId,
      );

      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // temp files — เช็คว่าเป็นของ user เองหรือไม่
      const tempMatch = filePathStr.match(/^temp\/(\d+)\//);
      if (tempMatch && tempMatch[1]) {
        const ownerId = parseInt(tempMatch[1]);
        if (ownerId !== user.userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } else {
        // path ไม่ตรง pattern ใดเลย — ปฏิเสธไว้ก่อน
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const fullPath = path.join(uploadsDir, ...filePath);

    const normalizedFull = path.normalize(fullPath);
    const normalizedBase = path.normalize(uploadsDir);
    if (!normalizedFull.startsWith(normalizedBase)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(fullPath);

    const ext = path.extname(fullPath).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".xls": "application/vnd.ms-excel",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-cache, max-age=0",
      },
    });
  } catch (error) {
    trackError(error instanceof Error ? error : new Error(String(error)), {
      url: "/api/uploads",
      action: "serve_file",
    });
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 },
    );
  }
}
