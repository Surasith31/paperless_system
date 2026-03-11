// api/users/login
import { NextRequest, NextResponse } from "next/server";
import { signJWT, setAuthCookie } from "@/lib/auth";
import { validateUserCredentials, getRoleName } from "@/repositories/users";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกอีเมลและรหัสผ่าน" },
        { status: 400 }
      );
    }

    // Validate credentials using lib function
    const { valid, user } = await validateUserCredentials(email, password);

    if (!valid || !user) {
      return NextResponse.json(
        { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    // สร้าง JWT token
    const token = signJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // สร้าง response
    const response = NextResponse.json({
      success: true,
      message: "เข้าสู่ระบบสำเร็จ",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleText: getRoleName(user.role),
      },
    });
    
    // ตั้งค่า JWT cookie
    setAuthCookie(response, token);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" },
      { status: 500 }
    );
  }
}
