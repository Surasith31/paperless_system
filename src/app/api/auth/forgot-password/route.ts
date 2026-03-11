import { NextRequest, NextResponse } from "next/server";
import { sendOTPEmail } from "@/lib/email";
import { pool } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "กรุณากรอกอีเมลที่ถูกต้อง" },
        { status: 400 }
      );
    }

    // Check if user exists
    const userResult = await pool.query(
      "SELECT id, name, email FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "ไม่พบผู้ใช้งานนี้ในระบบ" },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // OTP expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete old OTPs for this user
    await pool.query(
      "DELETE FROM password_reset_otps WHERE user_id = $1",
      [user.id]
    );

    // Save OTP to database
    await pool.query(
      `INSERT INTO password_reset_otps (user_id, email, otp, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, email, otp, expiresAt]
    );

    // Send OTP via email
    const emailSent = await sendOTPEmail({
      email: user.email,
      otp,
      name: user.name,
    });

    if (!emailSent) {
      return NextResponse.json(
        { success: false, error: "ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "ส่งรหัส OTP ไปยังอีเมลของคุณแล้ว",
      email: user.email,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการส่ง OTP" },
      { status: 500 }
    );
  }
}
