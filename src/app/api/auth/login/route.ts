// api/users/login
import { NextRequest, NextResponse } from "next/server";
import { signJWT, setAuthCookie } from "@/lib/auth";
import { validateUserCredentials, getRoleName } from "@/repositories/users";
import { trackError } from "@/lib/errorTracking";
import { rateLimit, getClientIP } from "@/lib/rateLimiter";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req);
    const { allowed, retryAfterSeconds } = rateLimit(ip, "login", 5, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: `ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ ${retryAfterSeconds} วินาที` },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    const parsed = loginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;

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
    trackError(error instanceof Error ? error : new Error(String(error)), {
      url: "/api/auth/login",
      action: "login",
    });
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" },
      { status: 500 }
    );
  }
}
