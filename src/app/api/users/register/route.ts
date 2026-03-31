// POST /api/users/register
import { NextRequest, NextResponse } from "next/server";
import { checkEmailExists, createUser } from "@/repositories/users";
import { trackError } from "@/lib/errorTracking";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อ"),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  role: z.union([z.literal(1), z.literal(2), z.literal(3)], {
    errorMap: () => ({ message: "Role ไม่ถูกต้อง" }),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = registerSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }
    const { name, email, password, role } = parsed.data;

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
    trackError(error instanceof Error ? error : new Error(String(error)), {
      url: "/api/users/register",
      action: "register_user",
    });
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการสมัครสมาชิก" },
      { status: 500 }
    );
  }
}
