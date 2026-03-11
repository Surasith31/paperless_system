// ================================================================
// User Management Library
// ================================================================
import { User } from "@/models/user";
import { pool } from "../lib/db";
import bcrypt from "bcrypt";

// Role mapping
export const ROLES = {
  Sell: 1,
  Manager: 2,
  Engineer: 3,
} as const;

export const ROLE_NAMES: { [key: number]: string } = {
  1: "Sell",
  2: "Manager",
  3: "Engineer",
};

export interface UserWithPassword extends User {
  password: string;
}

// Utility functions
export function getRoleName(role: number): string {
  return ROLE_NAMES[role] || "Unknown";
}

export function hasPermission(userRole: number, requiredRole: number): boolean {
  return userRole >= requiredRole;
}

// เช็คว่าอีเมลมีอยู่ในระบบหรือไม่
export async function checkEmailExists(email: string): Promise<boolean> {
  const result = await pool.query(`SELECT id FROM "users" WHERE email = $1`, [
    email,
  ]);
  return result.rows.length > 0;
}

// เช็คว่าอีเมลมีอยู่ในระบบหรือไม่ (พร้อมรหัสผ่าน)
export async function getUserByEmail(
  email: string
): Promise<UserWithPassword | null> {
  const result = await pool.query<UserWithPassword>(
    `SELECT id, name, email, password, role FROM "users" WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

// เช็คว่าผู้ใช้มีอยู่ในระบบหรือไม่ (ตาม ID)
export async function getUserById(userId: number): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT id, name, email, role FROM "users" WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

// สร้างผู้ใช้ใหม่
export async function createUser(
  name: string,
  email: string,
  password: string,
  role: number
): Promise<User | null> {
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await pool.query<User>(
    `INSERT INTO "users" (name, email, password, role, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, name, email, role`,
    [name, email, hashedPassword, role]
  );

  return result.rows[0] ?? null;
}

// อัปเดตข้อมูลโปรไฟล์ผู้ใช้
export async function updateUserProfile(
  userId: number,
  name: string,
  email: string
): Promise<void> {
  await pool.query(
    `UPDATE users SET name = $1, email = $2, updated_at = NOW() WHERE id = $3`,
    [name, email, userId]
  );
}

// เปลี่ยนรหัสผ่านผู้ใช้
export async function changeUserPassword(
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  // Get current password hash
  const result = await pool.query<{ password: string }>(
    `SELECT password FROM users WHERE id = $1`,
    [userId]
  );

  const row = result.rows[0];

  if (!row) {
    return { success: false, error: "User not found" };
  }

  const currentHash = row.password;

  // Verify old password
  const isValid = await bcrypt.compare(oldPassword, currentHash);
  if (!isValid) {
    return { success: false, error: "Current password is incorrect" };
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await pool.query(
    `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`,
    [hashedPassword, userId]
  );

  return { success: true };
}

// ดึงรายชื่อผู้จัดการทั้งหมด
export async function getManagersList(): Promise<User[]> {
  const result = await pool.query<User>(
    `SELECT id, name, email
     FROM users
     WHERE role = $1
     ORDER BY name ASC`,
    [ROLES.Manager]
  );
  return result.rows;
}

// ดึงรายชื่อ Engineer ทั้งหมด
export async function getEngineersList(): Promise<User[]> {
  const result = await pool.query<User>(
    `SELECT id, name, email
     FROM users
     WHERE role = $1
     ORDER BY name ASC`,
    [ROLES.Engineer]
  );
  return result.rows;
}

// ตรวจสอบข้อมูลผู้ใช้สำหรับการล็อกอิน
export async function validateUserCredentials(
  email: string,
  password: string
): Promise<{ valid: boolean; user?: User }> {
  const userWithPassword = await getUserByEmail(email);

  if (!userWithPassword) {
    return { valid: false };
  }

  const isValid = await bcrypt.compare(password, userWithPassword.password);

  if (!isValid) {
    return { valid: false };
  }

  // Return user without password
  const { password: _, ...user } = userWithPassword;
  return { valid: true, user };
}
