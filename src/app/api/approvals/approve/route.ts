// ================================================================
// ✅ API: Approve Document
// ================================================================
// POST /api/approvals/approve
// Manager อนุมัติเอกสารและส่งต่อให้ Engineer
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { ROLES } from "@/repositories/users";
import {
  approveDocument,
  checkEngineerExists,
  getPendingApprovalForUser,
} from "@/repositories/workflow";
import {
  sendApprovalNotificationEmail,
  sendEngineerAssignmentEmail,
} from "@/lib/email";
import { ApproveRequest } from "@/models/workflow";
import { logActivity } from "@/repositories/activities";
import { pool } from "@/lib/db";
import { trackError } from "@/lib/errorTracking";
import { z } from "zod";

const approveSchema = z.object({
  document_id: z.number({ invalid_type_error: "document_id ต้องเป็นตัวเลข" }).int().positive(),
  engineer_id: z.number().int().positive().optional().nullable(),
  comment: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // ตรวจสอบ authentication
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    // ตรวจสอบว่าเป็น Manager หรือไม่
    if (user.role !== ROLES.Manager) {
      return NextResponse.json(
        { error: "เฉพาะ Manager เท่านั้นที่สามารถอนุมัติเอกสารได้" },
        { status: 403 }
      );
    }

    // รับข้อมูลจาก request
    const parsed = approveSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }
    const { document_id, engineer_id, comment } = parsed.data;

    // ตรวจสอบว่ามี Engineer ID หรือไม่ (optional)
    let engineerIdToUse = null;
    if (engineer_id) {
      const engineerExists = await checkEngineerExists(engineer_id);

      if (!engineerExists) {
        return NextResponse.json(
          { error: "ไม่พบ Engineer ที่เลือก" },
          { status: 400 }
        );
      }
      engineerIdToUse = engineer_id;
    }

    // ตรวจสอบว่าเอกสารนี้รอ user นี้อนุมัติจริงหรือไม่
    const pendingApproval = await getPendingApprovalForUser(
      document_id,
      user.userId,
      1 // workflow_step
    );

    if (!pendingApproval) {
      return NextResponse.json(
        {
          error:
            "ไม่พบเอกสารที่รออนุมัติของคุณ หรือเอกสารได้รับการดำเนินการไปแล้ว",
        },
        { status: 400 }
      );
    }

    // อนุมัติเอกสาร + บันทึก activity log ใน transaction เดียวกัน
    const txClient = await pool.connect();
    let result;
    try {
      await txClient.query("BEGIN");

      result = await approveDocument(
        document_id,
        user.userId,
        engineerIdToUse,
        comment,
        txClient
      );

      await logActivity(
        user.userId,
        document_id,
        "document_approved",
        engineerIdToUse
          ? `อนุมัติเอกสารและส่งต่อให้ Engineer (ID: ${engineerIdToUse})`
          : "อนุมัติเอกสาร",
        { engineer_id: engineerIdToUse, comment },
        txClient
      );

      await txClient.query("COMMIT");
    } catch (err) {
      await txClient.query("ROLLBACK");
      throw err;
    } finally {
      txClient.release();
    }

    // ส่ง email แจ้งเตือน (ไม่ block response)
    const client = await pool.connect();
    try {
      // ดึงข้อมูล document และ users
      const docData = await client.query(
        `SELECT d.title, d.created_by, u.name as sell_name, u.email as sell_email
         FROM documents d
         JOIN users u ON d.created_by = u.id
         WHERE d.id = $1`,
        [document_id]
      );

      const managerData = await client.query(
        `SELECT name FROM users WHERE id = $1`,
        [user.userId]
      );

      if (docData.rows[0] && managerData.rows[0]) {
        // แจ้ง Sell ว่าเอกสารได้รับการอนุมัติ
        sendApprovalNotificationEmail({
          to: docData.rows[0].sell_email,
          sellName: docData.rows[0].sell_name,
          documentTitle: docData.rows[0].title,
          approverName: managerData.rows[0].name,
          approvedAt: new Date().toLocaleString("th-TH"),
          comment: comment,
        }).catch((err) => console.error("Failed to send approval email:", err));

        // ถ้ามี Engineer ให้แจ้งเตือน Engineer
        if (engineerIdToUse) {
          const engineerData = await client.query(
            `SELECT name, email FROM users WHERE id = $1`,
            [engineerIdToUse]
          );

          if (engineerData.rows[0]) {
            sendEngineerAssignmentEmail({
              to: engineerData.rows[0].email,
              engineerName: engineerData.rows[0].name,
              documentTitle: docData.rows[0].title,
              assignedBy: managerData.rows[0].name,
              assignedAt: new Date().toLocaleString("th-TH"),
              description: comment,
            }).catch((err) =>
              console.error("Failed to send engineer email:", err)
            );
          }
        }
      }
    } finally {
      client.release();
    }

    return NextResponse.json({
      success: true,
      message: engineerIdToUse
        ? "อนุมัติเอกสารและส่งต่อให้ Engineer สำเร็จ"
        : "อนุมัติเอกสารสำเร็จ",
      approval: result.approval,
      workflow: result.workflow,
    });
  } catch (error: unknown) {
    trackError(error instanceof Error ? error : new Error(String(error)), {
      url: "/api/approvals/approve",
      action: "approve_document",
    });
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอนุมัติเอกสาร" },
      { status: 500 }
    );
  }
}
