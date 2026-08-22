import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/notifications — Get all notifications for current user with unread count
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where = {
      userId: user.id,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: user.id, isRead: false },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      meta: {
        total,
        unreadCount,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications — Mark all or selected notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();

    let notificationIds: string[] | undefined;
    try {
      const body = await request.json();
      notificationIds = body.ids;
    } catch {
      // Empty body implies mark all as read
    }

    const where = {
      userId: user.id,
      isRead: false,
      ...(notificationIds && notificationIds.length > 0
        ? { id: { in: notificationIds } }
        : {}),
    };

    const updateResult = await prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    return NextResponse.json({
      success: true,
      message: `${updateResult.count} notification(s) marked as read.`,
      data: {
        updatedCount: updateResult.count,
        unreadCount,
      },
    });
  } catch (error) {
    console.error("Mark notifications read error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications — Clear all read notifications for user
export async function DELETE() {
  try {
    const user = await requireAuth();

    const deleteResult = await prisma.notification.deleteMany({
      where: {
        userId: user.id,
        isRead: true,
      },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    return NextResponse.json({
      success: true,
      message: `${deleteResult.count} read notification(s) deleted.`,
      data: {
        deletedCount: deleteResult.count,
        unreadCount,
      },
    });
  } catch (error) {
    console.error("Delete notifications error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
