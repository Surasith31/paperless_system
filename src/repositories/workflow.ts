import { pool } from "../lib/db";
import {
  DocumentWorkflow,
  Approval,
  PendingApproval,
  ApprovalHistoryItem,
} from "@/models/workflow";
import { PoolClient } from "pg";

// 📋 สร้าง Workflow สำหรับเอกสาร
export async function createWorkflow(
  documentId: number,
  managerId: number,
  createdBy: number,
  client?: PoolClient
): Promise<DocumentWorkflow> {
  const queryFn = client || pool;

  const result = await queryFn.query(
    `INSERT INTO document_workflows 
      (document_id, current_step, current_approver_id, assigned_by, status)
    VALUES ($1, 1, $2, $3, 'pending')
    RETURNING *`,
    [documentId, managerId, createdBy]
  );

  return result.rows[0];
}

// ✅ สร้าง Approval Record
export async function createApproval(
  documentId: number,
  workflowId: number,
  approverId: number,
  workflowStep: number,
  client?: PoolClient
): Promise<Approval> {
  const queryFn = client || pool;

  const result = await queryFn.query(
    `INSERT INTO approvals 
      (document_id, workflow_id, approver_id, workflow_step, status)
    VALUES ($1, $2, $3, $4, 'pending')
    RETURNING *`,
    [documentId, workflowId, approverId, workflowStep]
  );

  return result.rows[0];
}

// ✅ อนุมัติเอกสาร
export async function approveDocument(
  documentId: number,
  approverId: number,
  engineerId: number | null,
  comment?: string
): Promise<{ approval: Approval; workflow: DocumentWorkflow }> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. อัพเดท approval record
    const approvalResult = await client.query(
      `UPDATE approvals 
      SET status = 'approved', 
          approved_at = NOW(),
          comment = $1
      WHERE document_id = $2 AND approver_id = $3 AND status = 'pending'
      RETURNING *`,
      [comment, documentId, approverId]
    );

    if (approvalResult.rows.length === 0) {
      throw new Error("ไม่พบรายการรออนุมัติ");
    }

    const approval = approvalResult.rows[0];

    // 2. อัพเดท workflow - ถ้ามี Engineer ให้ส่งต่อ, ถ้าไม่มีให้จบ workflow
    let workflowUpdate;
    if (engineerId) {
      // ส่งต่อให้ Engineer
      workflowUpdate = await client.query(
        `UPDATE document_workflows 
        SET current_step = 2,
            current_approver_id = $1,
            assigned_by = $2,
            assigned_at = NOW(),
            status = 'pending'
        WHERE document_id = $3
        RETURNING *`,
        [engineerId, approverId, documentId]
      );

      // สร้าง approval record สำหรับ Engineer
      await client.query(
        `INSERT INTO approvals 
          (document_id, workflow_id, approver_id, workflow_step, status)
        VALUES ($1, $2, $3, 2, 'pending')`,
        [documentId, approval.workflow_id, engineerId]
      );

      // อัพเดทสถานะเอกสารเป็น in_progress
      await client.query(
        `UPDATE documents SET status = 'in_progress', updated_at = NOW()
        WHERE id = $1`,
        [documentId]
      );
    } else {
      // จบ workflow (ไม่ส่งต่อให้ Engineer)
      workflowUpdate = await client.query(
        `UPDATE document_workflows 
        SET status = 'completed',
            completed_at = NOW()
        WHERE document_id = $1
        RETURNING *`,
        [documentId]
      );

      // อัพเดทสถานะเอกสารเป็น approved
      await client.query(
        `UPDATE documents SET status = 'approved', updated_at = NOW()
        WHERE id = $1`,
        [documentId]
      );
    }

    await client.query("COMMIT");

    return {
      approval: approval,
      workflow: workflowUpdate.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ❌ ไม่อนุมัติเอกสาร
export async function rejectDocument(
  documentId: number,
  approverId: number,
  comment: string
): Promise<{ approval: Approval; workflow: DocumentWorkflow }> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. อัพเดท approval record
    const approvalResult = await client.query(
      `UPDATE approvals 
      SET status = 'rejected', 
          rejected_at = NOW(),
          comment = $1
      WHERE document_id = $2 AND approver_id = $3 AND status = 'pending'
      RETURNING *`,
      [comment, documentId, approverId]
    );

    if (approvalResult.rows.length === 0) {
      throw new Error("ไม่พบรายการรออนุมัติ");
    }

    const approval = approvalResult.rows[0];

    // 2. อัพเดท workflow เป็น rejected
    const workflowUpdate = await client.query(
      `UPDATE document_workflows 
      SET status = 'rejected',
          completed_at = NOW()
      WHERE document_id = $1
      RETURNING *`,
      [documentId]
    );

    // 3. อัพเดทสถานะเอกสารเป็น rejected
    await client.query(
      `UPDATE documents SET status = 'rejected', updated_at = NOW()
      WHERE id = $1`,
      [documentId]
    );

    await client.query("COMMIT");

    return {
      approval: approval,
      workflow: workflowUpdate.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// 📋 ดึงรายการเอกสารที่รออนุมัติ
export async function getPendingApprovals(approverId: number) {
  const result = await pool.query(
    `SELECT 
      d.*,
      dw.id as workflow_id,
      dw.current_step,
      dw.assigned_at,
      creator.name as creator_name,
      creator.email as creator_email
    FROM documents d
    JOIN document_workflows dw ON d.id = dw.document_id
    JOIN users creator ON d.created_by = creator.id
    WHERE dw.current_approver_id = $1 
      AND dw.status = 'pending'
    ORDER BY dw.assigned_at DESC`,
    [approverId]
  );

  return result.rows;
}

// 📋 ดึงรายการงานที่ได้รับมอบหมาย (สำหรับ Engineer)
export async function getAssignedDocuments(engineerId: number) {
  const result = await pool.query(
    `SELECT 
      d.*,
      dw.id as workflow_id,
      dw.assigned_at,
      dw.completed_at,
      dw.assigned_by,
      dw.status as workflow_status,
      assigner.name as assigned_by_name,
      creator.name as creator_name,
      creator.email as creator_email
    FROM documents d
    JOIN document_workflows dw ON d.id = dw.document_id
    JOIN users creator ON d.created_by = creator.id
    LEFT JOIN users assigner ON dw.assigned_by = assigner.id
    WHERE dw.current_approver_id = $1 
      AND dw.current_step = 2
      AND d.status IN ('in_progress', 'approved', 'completed')
    ORDER BY 
      CASE d.status 
        WHEN 'approved' THEN 1
        WHEN 'in_progress' THEN 2
        WHEN 'completed' THEN 3
      END,
      dw.assigned_at DESC`,
    [engineerId]
  );

  return result.rows;
}

//เช็คว่า Engineer มีอยู่จริงหรือไม่
export async function checkEngineerExists(
  engineerId: number
): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM users WHERE id = $1 AND role = 3`,
    [engineerId]
  );
  return result.rows.length > 0;
}

// ดึงรายการอนุมัติที่รอสำหรับผู้ใช้
export async function getPendingApprovalForUser(
  documentId: number,
  userId: number,
  workflowStep: number = 1
): Promise<PendingApproval | null> {
  const result = await pool.query<PendingApproval>(
    `SELECT dw.*
     FROM document_workflows dw
     WHERE dw.document_id = $1
       AND dw.current_approver_id = $2
       AND dw.status = 'pending'
       AND dw.current_step = $3`,
    [documentId, userId, workflowStep]
  );

  return result.rows[0] || null;
}

// ดึงประวัติการอนุมัติสำหรับผู้อนุมัติ
export async function getApprovalHistory(
  approverId: number
): Promise<ApprovalHistoryItem[]> {
  const result = await pool.query<ApprovalHistoryItem>(
    `SELECT 
        a.id as approval_id,
        a.status as approval_status,
        a.comment,
        a.approved_at,
        a.rejected_at,
        d.id as document_id,
        d.title,
        d.description,
        d.status as document_status,
        d.created_at as document_created_at,
        creator.name as creator_name,
        creator.email as creator_email,
        dw.current_step,
        engineer.name as engineer_name,
        engineer.email as engineer_email
      FROM approvals a
      JOIN documents d ON a.document_id = d.id
      JOIN users creator ON d.created_by = creator.id
      LEFT JOIN document_workflows dw ON d.id = dw.document_id
      LEFT JOIN users engineer ON dw.current_approver_id = engineer.id AND dw.current_step = 2
      WHERE a.approver_id = $1
        AND a.status IN ('approved', 'rejected')
      ORDER BY 
        COALESCE(a.approved_at, a.rejected_at) DESC`,
    [approverId]
  );

  return result.rows;
}
