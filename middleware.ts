import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "./src/lib/auth";

// Routes ที่ต้องการ authentication
const protectedRoutes = [
  "/page/dashboard",
  "/page/sell",
  "/page/manager",
  "/page/engineer",
];

// Routes ที่ user ที่ login แล้วไม่ควรเข้าถึง
const authRoutes = ["/page/login", "/page/register"];

// Routes ที่เป็น API และต้องการ authentication
const protectedApiRoutes = [
  "/api/auth/profile",
  "/api/users/profile",
  "/api/users/managers",
  "/api/users/engineers",
  "/api/documents/submit",
  "/api/documents/assigned",
  "/api/documents/", // Protect all documents API routes
  "/api/approvals/approve",
  "/api/approvals/reject",
  "/api/approvals/pending",
  "/api/upload",
  // NOTE: /api/files/ ไม่ได้อยู่ใน list นี้ เพราะต้องให้ browser ส่ง credentials ได้
  "/api/dashboard/stats",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // ตรวจสอบ authentication status
  const user = getAuthUser(request);
  const isAuthenticated = !!user;

  // ถ้าเป็น protected route และยังไม่ได้ login
  if (
    protectedRoutes.some((route) => pathname.startsWith(route)) &&
    !isAuthenticated
  ) {
    const loginUrl = new URL("/page/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control
  if (isAuthenticated) {
    // Sell (role 1) - can only access sell page
    if (user.role === 1 && pathname.startsWith("/page/sell")) {
      return NextResponse.next();
    }

    // Manager (role 2) - can only access manager page
    if (user.role === 2 && pathname.startsWith("/page/manager")) {
      return NextResponse.next();
    }

    // Engineer (role 3) - can only access engineer page
    if (user.role === 3 && pathname.startsWith("/page/engineer")) {
      return NextResponse.next();
    }

    // Redirect to appropriate page if trying to access wrong role page
    if (pathname.startsWith("/page/sell") && user.role !== 1) {
      return NextResponse.redirect(new URL("/page/dashboard", request.url));
    }
    if (pathname.startsWith("/page/manager") && user.role !== 2) {
      return NextResponse.redirect(new URL("/page/dashboard", request.url));
    }
    if (pathname.startsWith("/page/engineer") && user.role !== 3) {
      return NextResponse.redirect(new URL("/page/dashboard", request.url));
    }
  }

  // ถ้าเป็น auth route และ login แล้ว
  if (
    authRoutes.some((route) => pathname.startsWith(route)) &&
    isAuthenticated
  ) {
    return NextResponse.redirect(new URL("/page/dashboard", request.url));
  }

  // ถ้าเป็น protected API route และยังไม่ได้ login
  if (
    protectedApiRoutes.some((route) => pathname.startsWith(route)) &&
    !isAuthenticated
  ) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  // เพิ่ม user info ใน headers สำหรับ API routes ที่ authenticated
  if (isAuthenticated && pathname.startsWith("/api/")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", user.userId.toString());
    requestHeaders.set("x-user-email", user.email);
    requestHeaders.set("x-user-role", user.role.toString());

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

// กำหนด paths ที่ middleware จะทำงาน
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/api/:path*",
    "/page/:path*",
    // เพิ่ม specific paths แทน catch-all
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};
