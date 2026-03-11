export interface SendOTPEmailParams {
  email: string;
  otp: string;
  name?: string;
}
export interface ApprovalRequestParams {
  to: string;
  managerName: string;
  documentTitle: string;
  documentId: number;
  senderName: string;
  createdAt: string;
  description?: string;
}

export interface ApprovalNotificationParams {
  to: string;
  sellName: string;
  documentTitle: string;
  approverName: string;
  approvedAt: string;
  comment?: string;
}

export interface RejectionNotificationParams {
  to: string;
  sellName: string;
  documentTitle: string;
  rejectedBy: string;
  rejectedAt: string;
  reason?: string;
}

export interface EngineerAssignmentParams {
  to: string;
  engineerName: string;
  documentTitle: string;
  assignedBy: string;
  assignedAt: string;
  description?: string;
}

export interface CompletionNotificationParams {
  to: string;
  sellName: string; // ใช้เป็น receiver name (อาจเป็น Sell หรือ Manager)
  documentTitle: string;
  completedBy: string;
  completedAt: string;
  comment?: string;
  role: "sell" | "manager"; // เพิ่ม role เพื่อกำหนด link ที่ถูกต้อง
}