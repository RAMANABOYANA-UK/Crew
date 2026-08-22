import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/analytics/overview — High-level HR dashboard KPI metrics (Admin/HR only)
export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const [
      totalEmployees,
      activeEmployees,
      todayAttendance,
      pendingLeaves,
      payrolls,
      departmentsRaw,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { status: "ACTIVE" } }),
      prisma.attendance.findMany({
        where: { date: todayUTC },
        select: { status: true },
      }),
      prisma.leaveRequest.count({ where: { status: "PENDING" } }),
      prisma.payroll.findMany({
        select: { wage: true, netPayable: true, pfEmployee: true, pfEmployer: true, professionalTax: true },
      }),
      prisma.employee.groupBy({
        by: ["department"],
        _count: { id: true },
      }),
    ]);

    const presentToday = todayAttendance.filter(
      (a) => a.status === "PRESENT" || a.status === "HALF_DAY"
    ).length;

    const onLeaveToday = todayAttendance.filter(
      (a) => a.status === "ON_LEAVE"
    ).length;

    const absentToday = todayAttendance.filter(
      (a) => a.status === "ABSENT"
    ).length;

    const totalMonthlyPayroll = payrolls.reduce((sum, p) => sum + Number(p.netPayable), 0);
    const totalWageCTC = payrolls.reduce((sum, p) => sum + Number(p.wage), 0);
    const totalTaxesAndDeductions = payrolls.reduce(
      (sum, p) => sum + Number(p.pfEmployee) + Number(p.professionalTax),
      0
    );

    const departments = departmentsRaw.map((d) => ({
      department: d.department || "General",
      count: d._count.id,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        todayMetrics: {
          date: todayUTC.toISOString().split("T")[0],
          presentToday,
          onLeaveToday,
          absentToday,
          attendanceRate:
            activeEmployees > 0
              ? Math.round((presentToday / activeEmployees) * 100)
              : 0,
        },
        pendingLeaves,
        payrollMetrics: {
          totalMonthlyNetPayable: Math.round(totalMonthlyPayroll),
          totalMonthlyWageCTC: Math.round(totalWageCTC),
          totalTaxesAndDeductions: Math.round(totalTaxesAndDeductions),
          averageSalary:
            payrolls.length > 0
              ? Math.round(totalWageCTC / payrolls.length)
              : 0,
        },
        departments,
      },
    });
  } catch (error) {
    console.error("Analytics overview error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
