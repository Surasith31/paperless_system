// ================================================================
// Document Management Library
// ================================================================
import { PoolClient } from "pg";
import { pool } from "../lib/db";
import { DocumentWithWorkflow, EngineerDocumentStatus } from "@/models/document";

// ดึงเอกสารทั้งหมดที่ผู้ใช้สร้าง
export async function getMyDocuments(
  userId: number
): Promise<DocumentWithWorkflow[]> {
  const result = await pool.query<DocumentWithWorkflow>(
    `SELECT
       d.*,
       dw.status as workflow_status,
       dw.current_step,
       dw.current_approver_id,
       current_approver.name as current_approver_name,
       current_approver.email as current_approver_email,
       manager_approval.approver_id as manager_id,
       manager_user.name as manager_name,
       manager_user.email as manager_email,
       engineer_approval.approver_id as engineer_id,
       engineer_user.name as engineer_name,
       engineer_user.email as engineer_email
     FROM documents d
     LEFT JOIN document_workflows dw ON d.id = dw.document_id
     LEFT JOIN users current_approver ON dw.current_approver_id = current_approver.id
     LEFT JOIN approvals manager_approval ON d.id = manager_approval.document_id AND manager_approval.workflow_step = 1
     LEFT JOIN users manager_user ON manager_approval.approver_id = manager_user.id
     LEFT JOIN approvals engineer_approval ON d.id = engineer_approval.document_id AND engineer_approval.workflow_step = 2
     LEFT JOIN users engineer_user ON engineer_approval.approver_id = engineer_user.id
     WHERE d.created_by = $1
     ORDER BY d.created_at DESC`,
    [userId]
  );

  return result.rows;
}

// ดึงชื่อเอกสาร
export async function getDocumentTitle(
  documentId: number
): Promise<string | null> {
  const result = await pool.query<{ title: string }>(
    "SELECT title FROM documents WHERE id = $1",
    [documentId]
  );

  return result.rows[0]?.title || null;
}

// อัปเดตสถานะเอกสาร
export async function updateDocumentStatus(
  documentId: number,
  status: string,
  client: PoolClient
): Promise<void> {
  await client.query(
    `UPDATE documents 
     SET status = $1, updated_at = NOW()
     WHERE id = $2`,
    [status, documentId]
  );

  // If completed, update workflow
  if (status === "completed") {
    await client.query(
      `UPDATE document_workflows 
       SET status = 'completed', completed_at = NOW()
       WHERE document_id = $1`,
      [documentId]
    );
  }
}

// ดึงสถานะเอกสารสำหรับ Engineer
export async function getEngineerDocumentStatus(
  documentId: number,
  userId: number
): Promise<EngineerDocumentStatus | null> {
  const result = await pool.query(
    `SELECT 
      d.id,
      d.title,
      d.status as document_status,
      dw.status as workflow_status,
      dw.current_step,
      dw.assigned_at,
      dw.completed_at,
      creator.name as creator_name,
      assigner.name as assigned_by_name
    FROM documents d
    LEFT JOIN document_workflows dw ON d.id = dw.document_id
    LEFT JOIN users creator ON d.created_by = creator.id
    LEFT JOIN users assigner ON dw.assigned_by = assigner.id
    WHERE d.id = $1 
      AND dw.current_approver_id = $2
      AND dw.current_step = 2`,
    [documentId, userId]
  );

  return result.rows[0] || null;
}

// ตรวจสอบว่าผู้ใช้ Engineer ได้รับมอบหมายเอกสารหรือไม่
export async function checkEngineerAssignment(
  documentId: number,
  userId: number,
  client: PoolClient
): Promise<{ assigned: boolean; title?: string }> {
  const result = await client.query(
    `SELECT dw.*, d.title 
     FROM document_workflows dw
     JOIN documents d ON d.id = dw.document_id
     WHERE dw.document_id = $1 
       AND dw.current_approver_id = $2 
       AND dw.current_step = 2`,
    [documentId, userId]
  );

  if (result.rows.length === 0) {
    return { assigned: false };
  }

  return {
    assigned: true,
    title: result.rows[0].title,
  };
}

// ตรวจสอบว่า user มีสิทธิ์เข้าถึงเอกสารหรือไม่
export async function checkUserAccessToDocument(
  userId: number,
  documentId: number
): Promise<boolean> {
  const result = await pool.query(
    `SELECT EXISTS (
      -- เจ้าของเอกสาร
      SELECT 1 FROM documents WHERE id = $1 AND created_by = $2
      UNION
      -- Manager ที่ถูก assign
      SELECT 1 FROM approvals 
      WHERE document_id = $1 AND approver_id = $2 AND workflow_step = 1
      UNION
      -- Engineer ที่ถูก assign
      SELECT 1 FROM document_workflows 
      WHERE document_id = $1 AND current_approver_id = $2 AND current_step = 2
    ) as has_access`,
    [documentId, userId]
  );

  return result.rows[0]?.has_access || false;
}