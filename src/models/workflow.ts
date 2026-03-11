// แบบจำลองข้อมูล Workflow ของเอกสาร
export interface DocumentWorkflow {
  id: number;
  document_id: number;
  current_step: number; // 1=Manager, 2=Engineer
  current_approver_id?: number;
  assigned_by?: number;
  assigned_at: Date;
  completed_at?: Date;
  status: WorkflowStatus;
  workflow_data?: string;
}
// สถานะของ Workflow
export type WorkflowStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'completed' 
  | 'cancelled';
// สำหรับการมอบหมายงาน
export interface Approval {
  id: number;
  document_id: number;
  workflow_id?: number;
  approver_id: number;
  workflow_step: number;
  status: ApprovalStatus;
  comment?: string;
  approved_at?: Date;
  rejected_at?: Date;
  created_at: Date;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApproveRequest {
  document_id: number;
  engineer_id: number; // Engineer ที่เลือก
  comment?: string;
}

export interface RejectRequest {
  document_id: number;
  comment: string; // บังคับต้องมีเหตุผล
}

// ข้อมูลสำหรับแสดงผลการอนุมัติใน UI
export interface ApprovalData {
  approval_id: number;
  document_id: number;
  title: string;
  description?: string;
  creator_name: string;
  approval_status: string;
  document_status?: string;
  comment?: string;
  approved_at?: string;
  rejected_at?: string;
  engineer_name?: string;
}
// ข้อมูลการอนุมัติที่รอดำเนินการ
export interface PendingApproval {
  document_id: number;
  status: string;
  current_step: number;
  current_approver_id: number;
  assigned_at: Date | null;
  completed_at: Date | null;
}
// ข้อมูลประวัติการอนุมัติ
export interface ApprovalHistoryItem {
  approval_id: number;
  approval_status: "approved" | "rejected";
  comment: string | null;
  approved_at: Date | null;
  rejected_at: Date | null;

  document_id: number;
  title: string;
  description: string | null;
  document_status: string;
  document_created_at: Date;

  creator_name: string;
  creator_email: string;

  current_step: number | null;
  engineer_name: string | null;
  engineer_email: string | null;
}
