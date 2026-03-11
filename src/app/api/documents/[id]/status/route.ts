// ================================================================
// API: Update Document Status (Engineer only)
// ================================================================
// GET /api/documents/[id]/status - ดูสถานะการทำงาน
// PUT /api/documents/[id]/status - อัพเดทสถานะการทำงาน
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/repositories/activities";
import { getAuthUser } from "@/lib/auth";
import { ROLES } from "@/repositories/users";
import { sendCompletionNotificationEmail } from "@/lib/email";

import {
  checkEngineerAssignment,
  getEngineerDocumentStatus,
  updateDocumentStatus,
} from "@/repositories/documents";
import { pool } from "@/lib/db";

// GET - Get document status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentId = parseInt(id);

    // Authenticate user
    const user = getAuthUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - กรุณา login" },
        { status: 401 }
      );
    }

    // Get document status
    const document = await getEngineerDocumentStatus(documentId, user.userId);

    if (!document) {
      return NextResponse.json(
        { error: "ไม่พบเอกสารหรือคุณไม่มีสิทธิ์เข้าถึง" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error("Error getting work status:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
      { status: 500 }
    );
  }
}

// PUT - UPDATE document status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentId = parseInt(id);

    // Authenticate user
    const user = getAuthUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - กรุณา login" },
        { status: 401 }
      );
    }

    // Check if user is Engineer
    if (user.role !== ROLES.Engineer) {
      return NextResponse.json(
        { error: "เฉพาะ Engineer เท่านั้นที่สามารถอัพเดทสถานะได้" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, comment } = body;

    // Validate status
    const validStatuses = ["in_progress", "completed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Check if Engineer is assigned to this document
      const assignment = await checkEngineerAssignment(
        documentId,
        user.userId,
        client
      );

      if (!assignment.assigned) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "คุณไม่มีสิทธิ์อัพเดทเอกสารนี้" },
          { status: 403 }
        );
      }

      // Update document status
      await updateDocumentStatus(documentId, status, client);

      // Log activity
      const activityDescription =
        status === "in_progress" ? "เริ่มดำเนินการงาน" : "ทำงานเสร็จสิ้น";

      // สร้าง metadata object - รวม comment ถ้ามี
      const metadata: { new_status: string; comment?: string } = { 
        new_status: status 
      };
      
      if (comment && comment.trim()) {
        metadata.comment = comment.trim();
      }

      await logActivity(
        user.userId,
        documentId,
        "status_update",
        activityDescription,
        metadata,
        client
      );

      await client.query("COMMIT");

      // ส่ง email แจ้งเตือนเมื่องานเสร็จสมบูรณ์ (ส่งทั้ง Sell และ Manager)
      if (status === "completed") {
        try {
          // ดึงข้อมูล Sell, Manager, และ Engineer
          const emailData = await client.query(
            `SELECT 
              d.title,
              d.created_by,
              sell.name as sell_name,
              sell.email as sell_email,
              eng.name as engineer_name,
              manager.name as manager_name,
              manager.email as manager_email
            FROM documents d
            JOIN users sell ON d.created_by = sell.id
            JOIN users eng ON eng.id = $2
            JOIN document_workflows dw ON dw.document_id = d.id
            LEFT JOIN approvals a ON a.document_id = d.id AND a.workflow_step = 1 AND a.status = 'approved'
            LEFT JOIN users manager ON manager.id = a.approver_id
            WHERE d.id = $1`,
            [documentId, user.userId]
          );

          if (emailData.rows[0]) {
            const data = emailData.rows[0];
            const completedAt = new Date().toLocaleString("th-TH");

            // ส่งให้ Sell
            sendCompletionNotificationEmail({
              to: data.sell_email,
              sellName: data.sell_name,
              documentTitle: data.title,
              completedBy: data.engineer_name,
              completedAt: completedAt,
              role: "sell", // Link: /page/sell/my-documents
            }).catch((err) =>
              console.error("Failed to send completion email to Sell:", err)
            );

            // ส่งให้ Manager
            if (data.manager_email) {
              sendCompletionNotificationEmail({
                to: data.manager_email,
                sellName: data.manager_name,
                documentTitle: data.title,
                completedBy: data.engineer_name,
                completedAt: completedAt,
                role: "manager", // Link: /page/manager/approval-history
              }).catch((err) =>
                console.error(
                  "Failed to send completion email to Manager:",
                  err
                )
              );
            }
          }
        } catch (emailError) {
          console.error("Error sending completion emails:", emailError);
          // ไม่ throw error เพื่อไม่ให้กระทบการทำงานหลัก
        }
      }

      return NextResponse.json({
        success: true,
        message: "อัพเดทสถานะสำเร็จ",
        status: status,
        documentTitle: assignment.title,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error updating work status:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัพเดทสถานะ" },
      { status: 500 }
    );
  }
}
