import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployee } from "@/lib/auth";
import { leaveRequestSchema } from "@/lib/validations/leave";

// POST /api/leave — Employee applies for leave
// GET  /api/leave — Employee gets their own leave requests
export async function POST(request: NextRequest) {
  try {
    const employee = await getCurrentEmployee();
    if (!employee) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = leaveRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { leaveType, startDate, endDate, reason } = parsed.data;

    // Compute total days (inclusive)
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const totalDays =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check for overlapping leave requests (not rejected)
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: { not: "REJECTED" },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json(
        {
          error: "You already have a leave request overlapping with these dates.",
          existingLeave: overlapping,
        },
        { status: 409 }
      );
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveType,
        startDate: start,
        endDate: end,
        totalDays,
        reason,
        status: "PENDING",
      },
    });

    // Notify all Admins and HRs about the new leave submission
    try {
      const { notifyAdmins } = await import("@/lib/notifications");
      await notifyAdmins({
        title: "New Leave Request Submitted",
        message: `${employee.firstName} ${employee.lastName} has submitted a ${leaveType} leave request for ${totalDays} day(s).`,
        type: "LEAVE_SUBMITTED",
        link: `/dashboard/leave`,
        emailSubject: `[Dayflow HRMS] New Leave Request: ${employee.firstName} ${employee.lastName}`,
        emailText: `Hello Admin/HR,\n\n${employee.firstName} ${employee.lastName} has applied for ${leaveType} leave from ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]} (${totalDays} day(s)).\n\nReason: ${reason}\n\nPlease review it in the Dayflow HRMS portal.`,
      });
    } catch (notifyErr) {
      console.error("Failed to dispatch leave notification to admins:", notifyErr);
    }

    return NextResponse.json(
      { message: "Leave request submitted.", leaveRequest },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Leave apply error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const employee = await getCurrentEmployee();
    if (!employee) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { employeeId: employee.id };
    if (statusFilter) {
      where.status = statusFilter;
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const summary = {
      total: leaveRequests.length,
      pending: leaveRequests.filter((l) => l.status === "PENDING").length,
      approved: leaveRequests.filter((l) => l.status === "APPROVED").length,
      rejected: leaveRequests.filter((l) => l.status === "REJECTED").length,
    };

    return NextResponse.json({ leaveRequests, summary });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Leave fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
