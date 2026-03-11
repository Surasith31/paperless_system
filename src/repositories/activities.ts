import { pool } from "../lib/db";
import type { ActivityWithUser } from "@/models/activity";
import { PoolClient } from "pg";

export type ActivityMetadata = Record<string, unknown>;

// ดึง activities ทั้งหมดของเอกสาร
export async function getDocumentActivities(
  documentId: number
): Promise<ActivityWithUser[]> {
  const result = await pool.query(
    `SELECT 
      al.*,
      u.name as user_name,
      u.email as user_email,
      u.role as user_role
    FROM activities al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.document_id = $1
    ORDER BY al.created_at DESC`,
    [documentId]
  );

  return result.rows;
}

// 📊 บันทึก Activity Log
export async function logActivity(
  userId: number,
  documentId: number,
  action: string,
  description?: string,
  metadata?: ActivityMetadata,
  client?: PoolClient
) {
  const queryFn = client || pool;

  await queryFn.query(
    `INSERT INTO activities 
      (user_id, document_id, action, description, metadata)
    VALUES ($1, $2, $3, $4, $5)`,
    [userId, documentId, action, description, JSON.stringify(metadata)]
  );
}
