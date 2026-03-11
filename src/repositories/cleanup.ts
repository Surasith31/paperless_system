// ================================================================
// Cleanup Utilities for Temp Files
// ================================================================
import { pool } from "../lib/db";
import fs from "fs/promises";
import path from "path";

const ROOT_PATH = process.env["UPLOAD_DIR"]!;

export interface TempFile {
  id: number;
  file_path: string;
  thumbnail_path: string;
  created_at: Date;
}

// ดึง temp files ที่เก่ากว่าเวลาที่กำหนด
export async function getOldTempFiles(
  hoursOld: number = 24
): Promise<TempFile[]> {
  const result = await pool.query<TempFile>(
    `SELECT id, file_path, thumbnail_path, created_at
     FROM temp_files
     WHERE status = 'draft'
       AND created_at < NOW() - INTERVAL '${hoursOld} hours'`,
    []
  );

  return result.rows;
}

// ลบ temp file records จากฐานข้อมูล
export async function deleteTempFilesFromDB(
  hoursOld: number = 24
): Promise<number> {
  const result = await pool.query(
    `DELETE FROM temp_files
     WHERE status = 'draft'
       AND created_at < NOW() - INTERVAL '${hoursOld} hours'
     RETURNING id`
  );

  return result.rowCount || 0;
}

// Delete physical file from disk
export async function deletePhysicalFile(
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const absolutePath = path.join(ROOT_PATH, filePath);
    await fs.unlink(absolutePath);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// เคลียร์ไฟล์ชั่วคราวที่เก่ากว่าเวลาที่กำหนด
export async function cleanupOldTempFiles(
  hoursOld: number = 24
): Promise<{
  deleted: number;
  failed: number;
  errors: string[];
}> {
  const tempFiles = await getOldTempFiles(hoursOld);
  const errors: string[] = [];
  let deleted = 0;
  let failed = 0;

  for (const file of tempFiles) {
    // Delete main file
    const fileResult = await deletePhysicalFile(file.file_path);
    if (!fileResult.success) {
      errors.push(`File ${file.file_path}: ${fileResult.error}`);
      failed++;
      continue;
    }

    // Delete thumbnail
    if (file.thumbnail_path) {
      const thumbResult = await deletePhysicalFile(file.thumbnail_path);
      if (!thumbResult.success) {
        errors.push(`Thumbnail ${file.thumbnail_path}: ${thumbResult.error}`);
      }
    }

    deleted++;
  }

  // Delete records from database
  await deleteTempFilesFromDB(hoursOld);

  return {
    deleted,
    failed,
    errors,
  };
}
