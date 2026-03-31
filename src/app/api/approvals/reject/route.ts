// ================================================================
// ❌ API: Reject Document
// ================================================================
// POST /api/approvals/reject
// Manager ปฏิเสธเอกสาร
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { ROLES } from "@/repositories/users";
import { rejectDocument, getPendingApprovalForUser } from "@/repositories/workflow";
import { sendRejectionNotificationEmail } from "@/lib/email";
import { logActivity } from "@/repositories/activities";
import { RejectRequest } from "@/models/workflow";
import { pool } from "@/lib/db";
import { trackError } from "@/lib/errorTracking";
import { z } from "zod";

const rejectSchema = z.object({
  document_id: z.number({ invalid_type_error: "document_id ต้องเป็นตัวเลข" }).int().positive(),
  comment: z.string().min(1, "กรุณาระบุเหตุผลในการปฏิเสธ").max(1000),
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
        { error: "เฉพาะ Manager เท่านั้นที่สามารถปฏิเสธเอกสารได้" },
        { status: 403 }
      );
    }

    // รับข้อมูลจาก request
    const parsed = rejectSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }
    const { document_id, comment } = parsed.data;

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

    // ไม่อนุมัติเอกสาร + บันทึก activity log ใน transaction เดียวกัน
    const txClient = await pool.connect();
    let result;
    try {
      await txClient.query("BEGIN");

      result = await rejectDocument(document_id, user.userId, comment, txClient);

      await logActivity(
        user.userId,
        document_id,
        "document_rejected",
        `เอกสารไม่ผ่านการอนุมัติ`,
        { comment },
        txClient
      );

      await txClient.query("COMMIT");
    } catch (err) {
      await txClient.query("ROLLBACK");
      throw err;
    } finally {
      txClient.release();
    }

    // ส่ง email แจ้งเตือน Sell (ไม่ block response)
    const client = await pool.connect();
    try {
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
        sendRejectionNotificationEmail({
          to: docData.rows[0].sell_email,
          sellName: docData.rows[0].sell_name,
          documentTitle: docData.rows[0].title,
          rejectedBy: managerData.rows[0].name,
          rejectedAt: new Date().toLocaleString("th-TH"),
          reason: comment,
        }).catch((err) =>
          console.error("Failed to send rejection email:", err)
        );
      }
    } finally {
      client.release();
    }

    return NextResponse.json({
      success: true,
      message: "ไม่อนุมัติสำเร็จ",
      approval: result.approval,
      workflow: result.workflow,
    });
  } catch (error: unknown) {
    trackError(error instanceof Error ? error : new Error(String(error)), {
      url: "/api/approvals/reject",
      action: "reject_document",
    });
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการปฏิเสธเอกสาร" },
      { status: 500 }
    );
  }
}
