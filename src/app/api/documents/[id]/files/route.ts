// ================================================================
// 📋 API: Get All Files for a Document
// ================================================================
// GET /api/documents/[id]/files
// ดึงรายการไฟล์ทั้งหมดที่แนบกับเอกสาร
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getDocumentFiles } from "@/repositories/fileStorage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const documentId = parseInt(id);

    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    // Get files for this document
    const files = await getDocumentFiles(documentId);

    return NextResponse.json({
      success: true,
      files,
      total: files.length,
    });
  } catch (error) {
    console.error("Error getting document files:", error);
    return NextResponse.json(
      { error: "Failed to get document files" },
      { status: 500 }
    );
  }
}
