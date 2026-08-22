import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// PATCH /api/notifications/[id] — Mark a single notification as read/unread
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    let isRead = true;
    try {
      const body = await request.json();
      if (body.isRead !== undefined) isRead = Boolean(body.isRead);
    } catch {
      // Default to marking read
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== user.id) {
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 }
      );
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      unreadCount,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Update single notification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/notifications/[id] — Delete a specific notification
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== user.id) {
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 }
      );
    }

    await prisma.notification.delete({
      where: { id },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    return NextResponse.json({
      success: true,
      message: "Notification deleted successfully.",
      unreadCount,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Delete single notification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
