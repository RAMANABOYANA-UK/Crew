import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// GET /api/employees/status — Admin/HR gets status dots for all employees
export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        department: true,
        designation: true,
        profilePicture: true,
      },
    });

    // Get today's attendance records
    const todayAttendances = await prisma.attendance.findMany({
      where: { date: today },
    });

    // Get approved leave requests covering today
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: today },
        endDate: { gte: today },
      },
    });

    const attendanceMap = new Map(
      todayAttendances.map((a) => [a.employeeId, a])
    );
    const leaveMap = new Map(
      approvedLeaves.map((l) => [l.employeeId, l])
    );

    const statuses = employees.map((emp) => {
      const attendance = attendanceMap.get(emp.id);
      const leave = leaveMap.get(emp.id);

      let statusDot: "green" | "plane" | "yellow";
      let statusEmoji: string;
      let statusLabel: string;

      if (
        attendance &&
        (attendance.status === "PRESENT" || attendance.status === "HALF_DAY")
      ) {
        statusDot = "green";
        statusEmoji = "🟢";
        statusLabel = attendance.status === "HALF_DAY" ? "Half Day" : "Present";
      } else if (leave || (attendance && attendance.status === "ON_LEAVE")) {
        statusDot = "plane";
        statusEmoji = "✈️";
        statusLabel = "On Leave";
      } else {
        statusDot = "yellow";
        statusEmoji = "🟡";
        statusLabel = "Absent";
      }

      return {
        id: emp.id,
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        department: emp.department,
        designation: emp.designation,
        profilePicture: emp.profilePicture,
        statusDot,
        statusEmoji,
        statusLabel,
      };
    });

    const summary = {
      total: statuses.length,
      present: statuses.filter((s) => s.statusDot === "green").length,
      onLeave: statuses.filter((s) => s.statusDot === "plane").length,
      absent: statuses.filter((s) => s.statusDot === "yellow").length,
    };

    return NextResponse.json({
      success: true,
      data: { employees: statuses, summary },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }
    console.error("Employee status error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
