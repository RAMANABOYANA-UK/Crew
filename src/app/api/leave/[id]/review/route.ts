import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { leaveReviewSchema } from "@/lib/validations/leave";
import { applyLeaveApproval } from "@/lib/leave-approver";

// PATCH /api/leave/[id]/review — Admin/HR approves or rejects a leave request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const parsed = leaveReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          data: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { status, adminComment } = parsed.data;

    // Find the leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!leaveRequest) {
      return NextResponse.json(
        { success: false, message: "Leave request not found." },
        { status: 404 }
      );
    }

    if (leaveRequest.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: `Leave request has already been ${leaveRequest.status.toLowerCase()}.`,
          data: leaveRequest,
        },
        { status: 409 }
      );
    }

    if (status === "APPROVED") {
      const updated = await applyLeaveApproval(id, admin.id, adminComment);
      return NextResponse.json({
        success: true,
        data: updated,
        message: "Leave request approved.",
      });
    }

    // Reject leave request
    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        adminComment: adminComment || null,
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      },
      include: { employee: true },
    });

    // Notify employee of rejection
    if (updated.employee.userId) {
      try {
        const { createNotification } = await import("@/lib/notifications");
        await createNotification({
          userId: updated.employee.userId,
          userEmail: updated.employee.email || undefined,
          title: "Leave Request Rejected",
          message: `Your ${leaveRequest.leaveType} leave request (${leaveRequest.totalDays} day(s)) has been rejected.${
            adminComment ? ` Note: "${adminComment}"` : ""
          }`,
          type: "LEAVE_REJECTED",
          link: "/dashboard/leave",
        });
      } catch (err) {
        console.error("Failed to send rejection notification:", err);
      }
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Leave request rejected.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }
    console.error("Leave review error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
