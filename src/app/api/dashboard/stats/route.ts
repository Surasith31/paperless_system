import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getSellStats,
  getManagerStats,
  getEngineerStats,
} from "@/repositories/dashboard";
import { ROLES } from "@/repositories/users";

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = getAuthUser(request);

    if (!user) {
      console.error("❌ Unauthorized - no valid user");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = user.userId;
    const role = user.role;

    let stats;

    // Get stats based on role
    if (role === ROLES.Sell) {
      stats = await getSellStats(userId);
    } else if (role === ROLES.Manager) {
      stats = await getManagerStats(userId);
    } else if (role === ROLES.Engineer) {
      stats = await getEngineerStats(userId);
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid role" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("❌ Dashboard stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
