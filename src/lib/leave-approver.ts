import { prisma } from "./prisma";

export async function applyLeaveApproval(
  leaveRequestId: string,
  reviewerId: string = "SYSTEM",
  adminComment?: string
) {
  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    include: { employee: true },
  });

  if (!leaveRequest) {
    throw new Error("Leave request not found");
  }

  // Prevent double deduction if already APPROVED
  if (leaveRequest.status === "APPROVED") {
    return leaveRequest;
  }

  const start = new Date(leaveRequest.startDate);
  const end = new Date(leaveRequest.endDate);

  const attendanceRecords: Array<{
    employeeId: string;
    date: Date;
    status: "ON_LEAVE";
    notes: string;
  }> = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const currentDate = new Date(d);
    currentDate.setHours(0, 0, 0, 0);
    const dayOfWeek = currentDate.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

    attendanceRecords.push({
      employeeId: leaveRequest.employeeId,
      date: new Date(currentDate),
      status: "ON_LEAVE",
      notes: `Approved ${leaveRequest.leaveType.toLowerCase()} leave`,
    });
  }

  // Execute approval status update, leave balance deduction, and attendance upserts in a transaction
  const updatedRequest = await prisma.$transaction(async (tx) => {
    // 1. Update LeaveRequest status
    const updated = await tx.leaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        status: "APPROVED",
        adminComment: adminComment || leaveRequest.adminComment || null,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            userId: true,
            email: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    // 2. Deduct leave balance
    if (leaveRequest.leaveType === "PAID" || leaveRequest.leaveType === "CASUAL") {
      const currentBalance = leaveRequest.employee.paidLeaveBalance ?? 12;
      await tx.employee.update({
        where: { id: leaveRequest.employeeId },
        data: { paidLeaveBalance: Math.max(0, currentBalance - leaveRequest.totalDays) },
      });
    } else if (leaveRequest.leaveType === "SICK") {
      const currentBalance = leaveRequest.employee.sickLeaveBalance ?? 6;
      await tx.employee.update({
        where: { id: leaveRequest.employeeId },
        data: { sickLeaveBalance: Math.max(0, currentBalance - leaveRequest.totalDays) },
      });
    }

    // 3. Upsert ON_LEAVE Attendance records
    for (const record of attendanceRecords) {
      await tx.attendance.upsert({
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

    return updated;
  });

  // 4. Send notification
  if (updatedRequest.employee.userId) {
    try {
      const { createNotification } = await import("./notifications");
      await createNotification({
        userId: updatedRequest.employee.userId,
        userEmail: updatedRequest.employee.email || undefined,
        title: reviewerId === "SYSTEM" ? "Leave Request Auto-Approved" : "Leave Request Approved",
        message: `Your ${leaveRequest.leaveType} leave request (${leaveRequest.totalDays} day(s)) has been approved.${
          adminComment ? ` Note: "${adminComment}"` : ""
        }`,
        type: "LEAVE_APPROVED",
        link: "/dashboard/leave",
        emailSubject: `[Dayflow HRMS] Leave Request Approved: ${leaveRequest.leaveType}`,
        emailText: `Hello ${updatedRequest.employee.firstName},\n\nYour ${leaveRequest.leaveType} leave request for ${leaveRequest.totalDays} day(s) has been approved.\n\nRegards,\nDayflow HR Team`,
      });
    } catch (err) {
      console.error("Failed to send leave approval notification:", err);
    }
  }

  return updatedRequest;
}
