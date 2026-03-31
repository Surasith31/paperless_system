//auth.ts
import jwt, { SignOptions } from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { JWT_SECRET, JWT_EXPIRES_IN } from "./env";

// Interface สำหรับ JWT Payload
export interface JWTPayload {
  userId: number;
  email: string;
  role: number;
  iat?: number;
  exp?: number;
}

//สร้าง JWT Token
export function signJWT(payload: Omit<JWTPayload, "iat" | "exp">): string {
  try {
    return jwt.sign(payload, JWT_SECRET as string, {
      expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
    });
  } catch (error) {
    console.error("Error signing JWT:", error);
    throw new Error("Failed to create token");
  }
}

//ตรวจสอบและ decode JWT Token
export function verifyJWT(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error("Error verifying JWT:", error);
    return null;
  }
}

// ดึง JWT Token จาก cookies
export function getTokenFromRequest(request: NextRequest): string | null {
  const token = request.cookies.get("auth-token")?.value;
  // console.log(token)
  if (token) {
    return token;
  }
  // ถ้าไม่มีใน cookies ลองดึงจาก Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

//ตั้งค่า JWT Cookie ใน Response
export function setAuthCookie(response: NextResponse, token: string): void {
  // const isProduction = process.env.NODE_ENV === "production";

  response.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 1, // 1 วัน
    path: "/",
  });
}

//ลบ JWT Cookie
export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

//ตรวจสอบ authentication จาก request
export function getAuthUser(request: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(request);

  if (!token) {
    return null;
  }
  const decoded = verifyJWT(token);
  return decoded;
}
