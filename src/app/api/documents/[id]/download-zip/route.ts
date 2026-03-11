// ================================================================
// 📦 API: Download All Files as ZIP
// ================================================================
// GET /api/documents/[id]/download-zip
// ดาวน์โหลดไฟล์ทั้งหมดของ document เป็น ZIP
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getDocumentTitle } from "@/repositories/documents";
import { getDocumentFilesForZip } from "@/repositories/fileStorage";
import JSZip from "jszip";
import fs from "fs/promises";
import path from "path";

const ROOT_PATH = process.env["UPLOAD_DIR"]!;

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
    const documentId = parseInt(id);

    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    // Get document info
    const documentTitle = await getDocumentTitle(documentId);

    if (!documentTitle) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Get all files
    const files = await getDocumentFilesForZip(documentId);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files found for this document" },
        { status: 404 }
      );
    }

    // Create ZIP
    const zip = new JSZip();

    // Add files to ZIP
    for (const file of files) {
      try {
        const fullPath = path.join(ROOT_PATH, file.file_path);
        const fileBuffer = await fs.readFile(fullPath);
        zip.file(file.file_name, fileBuffer);
      } catch (error) {
        console.error(`Error reading file ${file.file_name}:`, error);
        // Skip this file and continue
      }
    }

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // Return ZIP file
    const sanitizedTitle = documentTitle.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `${sanitizedTitle}_files.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error creating ZIP:", error);
    return NextResponse.json(
      { error: "Failed to create ZIP file" },
      { status: 500 }
    );
  }
}
