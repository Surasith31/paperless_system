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
    const body: RejectRequest = await req.json();
    const { document_id, comment } = body;

    // Validate input
    if (!document_id || !comment) {
      return NextResponse.json(
        { error: "กรุณาระบุ document_id และเหตุผลในการปฏิเสธ" },
        { status: 400 }
      );
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

    // ไม่อนุมัติเอกสาร
    const result = await rejectDocument(document_id, user.userId, comment);

    // บันทึก activity log
    await logActivity(
      user.userId,
      document_id,
      "document_rejected",
      `เอกสารไม่ผ่านการอนุมัติ`,
      { comment }
    );

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
    console.error("Error rejecting document:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการปฏิเสธเอกสาร" },
      { status: 500 }
    );
  }
}
