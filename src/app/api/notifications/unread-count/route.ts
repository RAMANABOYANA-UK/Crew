import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/notifications/unread-count — Quick endpoint for unread badge count
export async function GET() {
  try {
    const user = await requireAuth();

    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    console.error("Fetch unread count error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
