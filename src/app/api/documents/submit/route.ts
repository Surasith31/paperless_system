// ================================================================
// 📤 API: Submit Document (Support Multiple Files)
// ================================================================
// POST /api/documents/submit
// Sell ส่งเอกสารให้ Manager อนุมัติ (รองรับหลายไฟล์)
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { ROLES } from "@/repositories/users";
import { logActivity } from "@/repositories/activities";
import { createWorkflow, createApproval } from "@/repositories/workflow";
import { sendApprovalRequestEmail } from "@/lib/email";
import { DocumentSubmitRequest } from "@/models/document";
import fs from "fs/promises";
import path from "path";
import { pool } from "@/lib/db";

const ROOT_PATH = process.env["UPLOAD_DIR"]!;

export async function POST(req: NextRequest) {
  const client = await pool.connect();

  try {
    // ตรวจสอบ authentication
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    // ตรวจสอบว่าเป็น Sell หรือไม่
    if (user.role !== ROLES.Sell) {
      return NextResponse.json(
        { error: "เฉพาะพนักงานขายเท่านั้นที่สามารถส่งเอกสารได้" },
        { status: 403 }
      );
    }

    // รับข้อมูลจาก request
    const body: DocumentSubmitRequest = await req.json();
    const {
      title,
      description,
      file_path, // รับ comma-separated paths: "db_file_1,db_file_2,db_file_3"
      file_name,
      file_size,
      mime_type,
      manager_id,
      message,
    } = body;

    // Validate input
    if (!title || !file_path || !file_name || !manager_id) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // 1. ตรวจสอบว่า Manager ID ที่เลือกเป็น Manager จริงหรือไม่
    const managerCheck = await client.query(
      `SELECT id FROM users WHERE id = $1 AND role = $2`,
      [manager_id, ROLES.Manager]
    );

    if (managerCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "ไม่พบ Manager ที่เลือก" },
        { status: 400 }
      );
    }

    // 2. แยก file_paths (comma-separated) - รองรับทั้ง path และ ID
    const filePaths = file_path.split(",").map((p) => p.trim());
    const fileIds: number[] = [];

    for (const path of filePaths) {
      // ถ้าเป็น path จริง (uploads/ หรือ temp/...) ให้หา ID จาก database
      if (path.includes("uploads") || path.includes("temp")) {
        const result = await client.query(
          `SELECT id FROM temp_files WHERE file_path = $1 AND created_by = $2`,
          [path, user.userId]
        );
        if (result.rows.length > 0) {
          fileIds.push(result.rows[0].id);
        }
      } else {
        // ถ้าเป็น format เก่า db_file_X
        const match = path.match(/db_file_(\d+)/);
        if (match && match[1]) {
          fileIds.push(parseInt(match[1]));
        }
      }
    }

    if (fileIds.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "ไม่พบไฟล์ที่อัพโหลด" },
        { status: 400 }
      );
    }

    // 3. สร้าง document ใหม่
    const documentResult = await client.query(
      `INSERT INTO documents 
       (title, description, file_path, created_by, status, file_name, file_size, mime_type) 
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7) 
       RETURNING id, title, status, created_at`,
      [
        title,
        description,
        file_path,
        user.userId,
        file_name,
        file_size,
        mime_type,
      ]
    );

    const document = documentResult.rows[0];
    const documentId = document.id;

    // Get temp files info
    const tempFiles = await client.query(
      `SELECT id, file_name, file_path, thumbnail_path, file_size, mime_type
       FROM temp_files
       WHERE id = ANY($1::int[]) AND created_by = $2
       ORDER BY id`,
      [fileIds, user.userId]
    );

    if (tempFiles.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "ไม่พบไฟล์ชั่วคราวหรือไฟล์ถูกใช้งานแล้ว" },
        { status: 400 }
      );
    }

    // Create year/month directory
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    // sanitize title สำหรับใช้เป็น folder name
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9._-]/g, "_");

    // ✅ ใช้ uploads folder โดยตรง (ไม่ใช่ใน public)
    const uploadDir = path.join(ROOT_PATH, String(year), month, sanitizedTitle);

    await fs.mkdir(uploadDir, { recursive: true });

    let fileOrder = 0;
    for (const tempFile of tempFiles.rows) {
      // sanitize ชื่อไฟล์
      const sanitizedFileName = tempFile.file_name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      // path ใหม่สำหรับไฟล์และ thumbnail
      const newFileName = `doc_${documentId}_${fileOrder}_${sanitizedFileName}`;
      const newFilePath = path.join(uploadDir, newFileName);
      const newThumbnailPath = path.join(
        uploadDir,
        `doc_${documentId}_${fileOrder}_thumb.jpg`
      );

      // move file
      // ✅ ใช้ uploads folder โดยตรง
      const oldFilePath = path.join(ROOT_PATH, tempFile.file_path);
      const oldThumbnailPath = path.join(ROOT_PATH, tempFile.thumbnail_path);

      try {
        await fs.rename(oldFilePath, newFilePath);
        if (await fs.stat(oldThumbnailPath).catch(() => null)) {
          await fs.rename(oldThumbnailPath, newThumbnailPath);
        }
      } catch (error) {
        console.error("Error moving file:", error);
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "ไม่สามารถย้ายไฟล์ได้" },
          { status: 500 }
        );
      }

      // relative path สำหรับ DB
      // ✅ คำนวณ path สัมพันธ์กับ uploads folder
      const uploadsBase = ROOT_PATH;

      const relativeFilePath = path
        .relative(uploadsBase, newFilePath)
        .replace(/\\/g, "/");


      const relativeThumbnailPath = path
        .relative(uploadsBase, newThumbnailPath)
        .replace(/\\/g, "/");

      // insert into document_files
      await client.query(
        `INSERT INTO document_files 
     (document_id, file_name, file_path, thumbnail_path, file_size, mime_type, file_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          documentId,
          tempFile.file_name,
          relativeFilePath,
          relativeThumbnailPath,
          tempFile.file_size,
          tempFile.mime_type,
          fileOrder,
        ]
      );

      fileOrder++;
    }

    // Delete temp records
    await client.query(`DELETE FROM temp_files WHERE id = ANY($1::int[])`, [
      fileIds,
    ]);

    const movedFileCount = tempFiles.rows.length;

    // 5. สร้าง workflow
    const workflow = await createWorkflow(
      documentId,
      manager_id,
      user.userId,
      client
    );


    // 6. สร้าง approval record สำหรับ Manager
    await createApproval(documentId, workflow.id, manager_id, 1, client);

    // 7. บันทึก activity log
    await logActivity(
      user.userId,
      documentId,
      "document_submitted",
      `ส่งเอกสาร "${title}" ให้ Manager อนุมัติ (${movedFileCount} ไฟล์)`,
      { manager_id, message, file_count: movedFileCount },
      client
    );

    await client.query("COMMIT");

    // 8. ส่ง email แจ้งเตือน Manager (ไม่ block response)
    const managerData = await client.query(
      `SELECT name, email FROM users WHERE id = $1`,
      [manager_id]
    );
    const userData = await client.query(
      `SELECT name FROM users WHERE id = $1`,
      [user.userId]
    );

    if (managerData.rows[0] && userData.rows[0]) {
      sendApprovalRequestEmail({
        to: managerData.rows[0].email,
        managerName: managerData.rows[0].name,
        documentTitle: title,
        documentId: documentId,
        senderName: userData.rows[0].name,
        createdAt: new Date().toLocaleString("th-TH"),
        description: description,
      }).catch((error) => {
        console.error("Failed to send email:", error);
        // ไม่ throw error เพื่อไม่ให้กระทบการทำงานหลัก
      });
    }

    return NextResponse.json({
      success: true,
      message: "ส่งเอกสารสำเร็จ",
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        created_at: document.created_at,
      },
      workflow: {
        id: workflow.id,
        current_step: workflow.current_step,
        current_approver_id: workflow.current_approver_id,
      },
      file_count: movedFileCount,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error submitting document:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการส่งเอกสาร" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
