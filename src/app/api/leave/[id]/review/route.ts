import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { leaveReviewSchema } from "@/lib/validations/leave";

// PATCH /api/leave/[id]/review — Admin/HR approves or rejects a leave request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole(["ADMIN", "HR"]);
    const { id } = await params;

    const body = await request.json();
    const parsed = leaveReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { status, adminComment } = parsed.data;

    // Find the leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!leaveRequest) {
      return NextResponse.json(
        { error: "Leave request not found." },
        { status: 404 }
      );
    }

    if (leaveRequest.status !== "PENDING") {
      return NextResponse.json(
        {
          error: `Leave request has already been ${leaveRequest.status.toLowerCase()}.`,
          leaveRequest,
        },
        { status: 409 }
      );
    }

    // Update the leave request
    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        adminComment: adminComment || null,
        reviewedBy: admin.clerkUserId,
        reviewedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    // If approved, create ON_LEAVE attendance records for each day in the leave period
    if (status === "APPROVED") {
      const start = new Date(leaveRequest.startDate);
      const end = new Date(leaveRequest.endDate);

      const attendanceRecords = [];
      for (
        let d = new Date(start);
        d <= end;
        d.setDate(d.getDate() + 1)
      ) {
        const currentDate = new Date(d);
        currentDate.setHours(0, 0, 0, 0);
        const dayOfWeek = currentDate.getDay();

        // Skip weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        attendanceRecords.push({
          employeeId: leaveRequest.employeeId,
          date: new Date(currentDate),
          status: "ON_LEAVE" as const,
          notes: `Approved ${leaveRequest.leaveType.toLowerCase()} leave`,
        });
      }

      // Upsert attendance records (in case some already exist)
      for (const record of attendanceRecords) {
        await prisma.attendance.upsert({
          where: {
            employeeId_date: {
              employeeId: record.employeeId,
              date: record.date,
            },
          },
          update: {
            status: "ON_LEAVE",
            notes: record.notes,
            checkIn: null,
            checkOut: null,
            hoursWorked: null,
          },
          create: record,
        });
      }
    }

    return NextResponse.json({
      message: `Leave request ${status.toLowerCase()}.`,
      leaveRequest: updated,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Leave review error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
