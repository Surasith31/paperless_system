import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getUserById, getRoleName, changeUserPassword, updateUserProfile } from "@/repositories/users";

export async function GET(req: NextRequest) {
  try {
    // ดึงข้อมูล user จาก JWT token
    const authUser = getAuthUser(req);
    
    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ดึงข้อมูล user ล่าสุดจากฐานข้อมูล
    const user = await getUserById(authUser.userId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleText: getRoleName(user.role),
      },
    });
  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
      { status: 500 }
    );
  }
}

// อัพเดทข้อมูลโปรไฟล์ผู้ใช้
export async function PUT(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, currentPassword, newPassword } = body;

    // Validate input
    if (!name || !email) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
        { status: 400 }
      );
    }

    // Get current user data
    const currentUser = await getUserById(user.userId);
    if (!currentUser) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    // Check if email is already used by another user
    if (email !== currentUser.email) {
      const { checkEmailExists } = await import("@/repositories/users");
      const emailExists = await checkEmailExists(email);

      if (emailExists) {
        return NextResponse.json(
          { error: "อีเมลนี้ถูกใช้งานแล้ว" },
          { status: 400 }
        );
      }
    }

    // If changing password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "กรุณากรอกรหัสผ่านปัจจุบัน" },
          { status: 400 }
        );
      }

      const result = await changeUserPassword(
        user.userId,
        currentPassword,
        newPassword
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    // Update profile
    await updateUserProfile(user.userId, name, email);

    return NextResponse.json({
      success: true,
      message: "อัพเดทข้อมูลสำเร็จ",
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัพเดทข้อมูล" },
      { status: 500 }
    );
  }
}
