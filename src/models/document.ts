// แบบจำลองข้อมูลเอกสาร
export interface Document {
  id: number;
  title: string;
  description?: string;
  file_path: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  status: DocumentStatus;
}
// สถานะของเอกสาร
export type DocumentStatus = 
  | 'draft' 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'archived' 
  | 'in_progress' 
  | 'completed';

// สำหรับการส่งเอกสารใหม่
export interface DocumentSubmitRequest {
  title: string;
  description?: string;
  file_path: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  manager_id: number; // Manager ที่เลือก
  message?: string; // ข้อความถึง Manager
}

// สำหรับหน้ารายการเอกสารทั่วไป
export interface DocumentData {
  id: number;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  current_approver_name?: string;
  manager_name?: string;
  manager_email?: string;
  engineer_name?: string;
  engineer_email?: string;
  current_step?: string;
}
// สำหรับหน้ารายการเอกสารที่ถูกมอบหมาย
export interface AssignedDocument {
  id: number;
  title: string;
  description: string;
  file_path: string;
  file_name: string;
  status: string;
  workflow_id: number;
  assigned_at: string;
  completed_at?: string;
  assigned_by: number;
  assigned_by_name: string;
  creator_name: string;
  creator_email: string;
}
// สำหรับไฟล์เอกสารที่แนบมา
export interface DocumentFile {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileOrder: number;
  url: string;
}
// สำหรับเอกสารพร้อมสถานะเวิร์กโฟลว์
export interface DocumentWithWorkflow {
  id: number;
  title: string;
  description?: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  status: string;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  workflow_status?: string;
  current_step?: number;
  current_approver_id?: number;
  current_approver_name?: string;
  current_approver_email?: string;
  manager_id?: number;
  manager_name?: string;
  manager_email?: string;
  engineer_id?: number;
  engineer_name?: string;
  engineer_email?: string;
}
// สำหรับหน้ารายการเอกสารของ engineer
export interface EngineerDocumentStatus {
  id: number;
  title: string;
  document_status: string;
  workflow_status: string | null;
  current_step: number | null;
  assigned_at: Date | null;
  completed_at: Date | null;
  creator_name: string | null;
  assigned_by_name: string | null;
}
