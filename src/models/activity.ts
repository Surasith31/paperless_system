// ใช้กับตาราง activity_log ที่มีอยู่แล้วใน database
export interface Activity {
  id: number;
  user_id?: number;
  document_id?: number;
  action: string;
  description?: string;
  metadata?: string; // JSONB field
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}
// ข้อมูล Activity พร้อมข้อมูลผู้ใช้
export interface ActivityWithUser extends Activity {
  user_name?: string;
  user_email?: string;
  user_role?: string;
}