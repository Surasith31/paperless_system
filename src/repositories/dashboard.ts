// ================================================================
// Dashboard Statistics Library
// ================================================================
import { pool } from "../lib/db";

export interface DashboardStats {
  totalDocuments: number;
  pendingApprovals: number;
  approvedDocuments: number;
  completedTasks?: number;
  assignedTasks?: number;
}

// ดึงสถิติสำหรับผู้ขาย
export async function getSellStats(userId: number): Promise<DashboardStats> {
  const stats: DashboardStats = {
    totalDocuments: 0,
    pendingApprovals: 0,
    approvedDocuments: 0,
    completedTasks: 0,
  };

  // Total documents created by this user
  const totalResult = await pool.query(
    `SELECT COUNT(*) as count FROM documents WHERE created_by = $1`,
    [userId]
  );
  stats.totalDocuments = parseInt(totalResult.rows[0].count);

  // Pending approvals - documents waiting for Manager approval
  const pendingResult = await pool.query(
    `SELECT COUNT(DISTINCT d.id) as count
     FROM documents d
     LEFT JOIN approvals a ON d.id = a.document_id AND a.workflow_step = 1
     WHERE d.created_by = $1 
       AND (a.status = 'pending' OR a.status IS NULL)
       AND d.status = 'pending'`,
    [userId]
  );
  stats.pendingApprovals = parseInt(pendingResult.rows[0].count);

  // Approved by Manager
  const approvedResult = await pool.query(
    `SELECT COUNT(DISTINCT d.id) as count
     FROM documents d
     INNER JOIN approvals a ON d.id = a.document_id
     WHERE d.created_by = $1 
       AND a.workflow_step = 1 
       AND a.status = 'approved'`,
    [userId]
  );
  stats.approvedDocuments = parseInt(approvedResult.rows[0].count);

  // Completed tasks
  const completedResult = await pool.query(
    `SELECT COUNT(DISTINCT d.id) as count
     FROM documents d
     WHERE d.created_by = $1
       AND d.status = 'completed'`,
    [userId]
  );
  stats.completedTasks = parseInt(completedResult.rows[0].count);

  return stats;
}

// ดึงสถิติสำหรับผู้จัดการ
export async function getManagerStats(userId: number): Promise<DashboardStats> {
  const stats: DashboardStats = {
    totalDocuments: 0,
    pendingApprovals: 0,
    approvedDocuments: 0,
  };

  // Total documents assigned to this manager
  const totalResult = await pool.query(
    `SELECT COUNT(DISTINCT d.id) as count
     FROM documents d
     INNER JOIN approvals a ON d.id = a.document_id
     WHERE a.approver_id = $1 AND a.workflow_step = 1`,
    [userId]
  );
  stats.totalDocuments = parseInt(totalResult.rows[0].count);

  // Pending approvals
  const pendingResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM approvals
     WHERE approver_id = $1 AND status = 'pending'`,
    [userId]
  );
  stats.pendingApprovals = parseInt(pendingResult.rows[0].count);

  // Approved documents
  const approvedResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM approvals
     WHERE approver_id = $1 AND status = 'approved'`,
    [userId]
  );
  stats.approvedDocuments = parseInt(approvedResult.rows[0].count);

  return stats;
}

// ดึงสถิติสำหรับ Engineer
export async function getEngineerStats(userId: number): Promise<DashboardStats> {
  const stats: DashboardStats = {
    totalDocuments: 0,
    pendingApprovals: 0,
    approvedDocuments: 0,
    assignedTasks: 0,
  };

  // Total tasks assigned
  const totalResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM document_workflows dw
     JOIN documents d ON d.id = dw.document_id
     WHERE dw.current_approver_id = $1 
       AND dw.current_step = 2
       AND d.status IN ('in_progress', 'approved', 'completed')`,
    [userId]
  );
  stats.assignedTasks = parseInt(totalResult.rows[0].count);
  stats.totalDocuments = stats.assignedTasks;

  // In Progress tasks
  const inProgressResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM document_workflows dw
     JOIN documents d ON d.id = dw.document_id
     WHERE dw.current_approver_id = $1 
       AND dw.current_step = 2
       AND d.status = 'in_progress'`,
    [userId]
  );
  stats.pendingApprovals = parseInt(inProgressResult.rows[0].count);

  // Completed tasks
  const completedResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM document_workflows dw
     JOIN documents d ON d.id = dw.document_id
     WHERE dw.current_approver_id = $1 
       AND dw.current_step = 2
       AND d.status = 'completed'`,
    [userId]
  );
  stats.approvedDocuments = parseInt(completedResult.rows[0].count);

  return stats;
}
