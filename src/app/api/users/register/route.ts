// POST /api/users/register
import { NextRequest, NextResponse } from "next/server";
import { checkEmailExists, createUser } from "@/repositories/users";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json();

    // Validate input
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามี email นี้แล้วหรือยัง
    const emailExists = await checkEmailExists(email);

    if (emailExists) {
      return NextResponse.json(
        { error: "อีเมลนี้ถูกใช้งานแล้ว" },
        { status: 400 }
      );
    }

    // Create user
    const user = await createUser(name, email, password, role);

    return NextResponse.json({
      success: true,
      message: "สมัครสมาชิกสำเร็จ",
      user: user,
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการสมัครสมาชิก" },
      { status: 500 }
    );
  }
}
