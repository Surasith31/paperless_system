// ================================================================
// 🧹 API: Cleanup Old Temp Files
// ================================================================
// GET /api/cleanup/temp-files
// ลบไฟล์ชั่วคราวที่เก่าเกิน 24 ชั่วโมง
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { cleanupOldTempFiles } from "@/repositories/cleanup";

export async function GET(req: NextRequest) {
  try {
    // ตรวจสอบ authorization (optional - ใส่ secret key)
    const authHeader = req.headers.get("authorization");
    const CLEANUP_SECRET = process.env["CLEANUP_SECRET"]!

    if (authHeader !== `Bearer ${CLEANUP_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🧹 Starting cleanup of old temp files...");

    // Clean up old temp files (24 hours)
    const result = await cleanupOldTempFiles(24);

    console.log(
      `✅ Cleanup completed: ${result.deleted} files deleted, ${result.failed} failed`
    );

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deleted} old temp files`,
      deleted: result.deleted,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error("❌ Cleanup error:", error);
    return NextResponse.json(
      {
        error: "Failed to cleanup temp files",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
