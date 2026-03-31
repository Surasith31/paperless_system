// ================================================================
// File Storage in File System
// ================================================================
import { pool } from "../lib/db";
import { UPLOAD_DIR } from "../lib/env";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const ROOT_PATH = UPLOAD_DIR;

export const FILE_CONFIG = {
  maxFileSize: 50 * 1024 * 1024,      // 50 MB ต่อไฟล์
  maxTotalSize: 200 * 1024 * 1024,    // 200 MB รวมทั้งหมดต่อครั้ง
  maxFiles: 10,
  allowedTypes: {
    images: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
    documents: ["application/pdf"],
    excel: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  },
  thumbnailSize: { width: 300, height: 300 },

  // ✔️ ใช้ UPLOAD_DIR เป็น uploads โดยตรง
  uploadDir: ROOT_PATH,
  tempDir: path.join(ROOT_PATH, "temp"),
};

// ================================================================
// เช็คและสร้างโฟลเดอร์อัพโหลดถ้ายังไม่มี
// ================================================================
export async function ensureUploadDirs() {
  try {
    await fs.mkdir(FILE_CONFIG.uploadDir, { recursive: true });
    await fs.mkdir(FILE_CONFIG.tempDir, { recursive: true });

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const monthDir = path.join(FILE_CONFIG.uploadDir, String(year), month);
    await fs.mkdir(monthDir, { recursive: true });

    return monthDir;
  } catch (error) {
    console.error("Error creating upload directories:", error);
    throw error;
  }
}

// ================================================================
// Validate File
// ================================================================
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > FILE_CONFIG.maxFileSize) {
    const maxMB = FILE_CONFIG.maxFileSize / (1024 * 1024);
    return { valid: false, error: `ไฟล์ขนาดใหญ่เกินไป สูงสุด ${maxMB} MB ต่อไฟล์` };
  }

  const allAllowedTypes = [
    ...FILE_CONFIG.allowedTypes.images,
    ...FILE_CONFIG.allowedTypes.documents,
    ...FILE_CONFIG.allowedTypes.excel,
  ];

  if (!allAllowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "ไฟล์ต้องเป็น PDF, Excel หรือรูปภาพเท่านั้น",
    };
  }

  return { valid: true };
}

// ================================================================
// สร้าง thumbnail สำหรับไฟล์
// ================================================================
async function generateThumbnail(
  fileBuffer: Buffer,
  mimeType: string,
  outputPath: string
): Promise<boolean> {
  try {
    if (FILE_CONFIG.allowedTypes.images.includes(mimeType)) {
      // Generate thumbnail from image
      await sharp(fileBuffer)
        .resize(
          FILE_CONFIG.thumbnailSize.width,
          FILE_CONFIG.thumbnailSize.height,
          {
            fit: "cover",
            position: "center",
          }
        )
        .jpeg({ quality: 80 })
        .toFile(outputPath);
      return true;
    } else if (mimeType === "application/pdf") {
      // Generate placeholder for PDF (red background)
      await sharp({
        create: {
          width: 300,
          height: 300,
          channels: 3,
          background: { r: 239, g: 68, b: 68 },
        },
      })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
      return true;
    } else if (FILE_CONFIG.allowedTypes.excel.includes(mimeType)) {
      // Generate placeholder for Excel (green background)
      await sharp({
        create: {
          width: 300,
          height: 300,
          channels: 3,
          background: { r: 34, g: 197, b: 94 },
        },
      })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return false;
  }
}

// ================================================================
// Save File to Temp Directory
// ================================================================
export async function saveFileToDatabase(
  file: File,
  userId: number
): Promise<{
  fileId: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
}> {
  try {
    // Ensure directories exist
    await ensureUploadDirs();

    // Create user temp directory
    const userTempDir = path.join(FILE_CONFIG.tempDir, String(userId));
    await fs.mkdir(userTempDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${timestamp}_${sanitizedName}`;
    const filePath = path.join(userTempDir, fileName);
    const thumbnailPath = path.join(
      userTempDir,
      `${timestamp}_${sanitizedName.replace(/\.[^/.]+$/, "")}_thumb.jpg`
    );

    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const fileBuffer = Buffer.from(bytes);
    await fs.writeFile(filePath, fileBuffer);

    // Generate thumbnail
    await generateThumbnail(fileBuffer, file.type, thumbnailPath);

    // Save to database
    const relativePath = path.relative(ROOT_PATH, filePath);
    const relativeThumbnailPath = path.relative(ROOT_PATH, thumbnailPath);

    const result = await pool.query(
      `INSERT INTO temp_files 
       (title, file_name, file_path, thumbnail_path, file_size, mime_type, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
       RETURNING id`,
      [
        "temp_" + file.name,
        file.name,
        relativePath.replace(/\\/g, "/"),
        relativeThumbnailPath.replace(/\\/g, "/"),
        file.size,
        file.type,
        userId,
      ]
    );

    const fileId = result.rows[0].id;

    return {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      filePath: relativePath.replace(/\\/g, "/"),
    };
  } catch (error) {
    console.error("Error saving file to temp:", error);
    throw new Error("ไม่สามารถบันทึกไฟล์ได้");
  }
}

// ================================================================
// Get All Files for a Document
// ================================================================
export async function getDocumentFiles(documentId: number): Promise<
  Array<{
    id: number;
    fileName: string;
    fileSize: number;
    mimeType: string;
    fileOrder: number;
    url: string;
    thumbnailUrl: string;
  }>
> {
  try {
    const result = await pool.query(
      `SELECT id, file_name, file_path, thumbnail_path, file_size, mime_type, file_order
       FROM document_files
       WHERE document_id = $1
       ORDER BY file_order ASC`,
      [documentId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      fileName: row.file_name,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      fileOrder: row.file_order,
      // ✅ ใช้ /api/uploads prefix
      url: `/api/uploads/${row.file_path}`,
      thumbnailUrl: `/api/uploads/${row.thumbnail_path}`,
    }));
  } catch (error) {
    console.error("Error getting document files:", error);
    return [];
  }
}

// ================================================================
// Additional File Helper Functions
// ================================================================

/**
 * Get file path by file ID
 */
export async function getFilePathById(
  fileId: number
): Promise<string | null> {
  const result = await pool.query(
    `SELECT file_path FROM document_files WHERE id = $1`,
    [fileId]
  );

  return result.rows[0]?.file_path || null;
}

/**
 * Get thumbnail path by file ID
 */
export async function getThumbnailPathById(
  fileId: number
): Promise<string | null> {
  const result = await pool.query(
    `SELECT thumbnail_path FROM document_files WHERE id = $1`,
    [fileId]
  );

  return result.rows[0]?.thumbnail_path || null;
}

/**
 * Get file info (path + document_id + name) by file ID — ใช้สำหรับ activity log
 */
export async function getFileInfoById(fileId: number): Promise<{
  filePath: string;
  thumbnailPath: string;
  documentId: number;
  fileName: string;
} | null> {
  const result = await pool.query(
    `SELECT file_path, thumbnail_path, document_id, file_name FROM document_files WHERE id = $1`,
    [fileId]
  );

  if (!result.rows[0]) return null;
  return {
    filePath: result.rows[0].file_path,
    thumbnailPath: result.rows[0].thumbnail_path,
    documentId: result.rows[0].document_id,
    fileName: result.rows[0].file_name,
  };
}

/**
 * Get files for download (with file paths)
 */
export async function getDocumentFilesForZip(
  documentId: number
): Promise<Array<{ file_name: string; file_path: string }>> {
  const result = await pool.query(
    `SELECT file_name, file_path
     FROM document_files
     WHERE document_id = $1
     ORDER BY file_order ASC`,
    [documentId]
  );

  return result.rows;
}
