import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// GET /api/attendance/risk — Admin gets attendance risk flags & anomaly analysis
export async function GET() {
  try {
    await requireAdmin();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [employees, attendances] = await Promise.all([
      prisma.employee.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          department: true,
          designation: true,
        },
      }),
      prisma.attendance.findMany({
        where: {
          date: { gte: thirtyDaysAgo },
        },
        select: {
          employeeId: true,
          date: true,
          checkIn: true,
          status: true,
        },
      }),
    ]);

    const employeeRiskMap = new Map<
      string,
      { lateCount: number; absentCount: number }
    >();

    for (const att of attendances) {
      const existing = employeeRiskMap.get(att.employeeId) || {
        lateCount: 0,
        absentCount: 0,
      };

      if (att.status === "ABSENT") {
        existing.absentCount += 1;
      }

      if (att.checkIn) {
        const checkInDate = new Date(att.checkIn);
        const hours = checkInDate.getUTCHours();
        const minutes = checkInDate.getUTCMinutes();
        // Check-in after 9:30 AM
        if (hours > 9 || (hours === 9 && minutes > 30)) {
          existing.lateCount += 1;
        }
      }

      employeeRiskMap.set(att.employeeId, existing);
    }

    const riskyEmployees = [];

    for (const emp of employees) {
      const stats = employeeRiskMap.get(emp.id) || {
        lateCount: 0,
        absentCount: 0,
      };

      const risks: string[] = [];
      if (stats.lateCount > 3) {
        risks.push("Frequently Late");
      }
      if (stats.absentCount > 4) {
        risks.push("High Absence");
      }

      if (risks.length > 0) {
        riskyEmployees.push({
          employeeId: emp.employeeId,
          firstName: emp.firstName,
          lastName: emp.lastName,
          department: emp.department,
          designation: emp.designation,
          lateCount: stats.lateCount,
          absentCount: stats.absentCount,
          riskFlags: risks,
          riskLevel: risks.length > 1 ? "HIGH" : "MEDIUM",
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRiskyEmployees: riskyEmployees.length,
        riskyEmployees,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }
    console.error("Attendance risk calculation error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
