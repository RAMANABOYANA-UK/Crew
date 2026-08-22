import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/analytics/summary — In-depth breakdown for department, attendance trends, leaves, and payroll
export async function GET() {
  try {
    await requireAdmin();

    const [
      employees,
      payrolls,
      leaves,
      recentAttendance,
    ] = await Promise.all([
      prisma.employee.findMany({
        select: {
          id: true,
          department: true,
          status: true,
          payroll: { select: { wage: true, netPayable: true } },
        },
      }),
      prisma.payroll.findMany(),
      prisma.leaveRequest.findMany({
        select: { leaveType: true, totalDays: true, status: true },
      }),
      prisma.attendance.findMany({
        where: {
          date: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: { date: true, status: true },
      }),
    ]);

    // 1. Department Breakdown with Salary Aggregates
    const deptMap = new Map<
      string,
      { count: number; activeCount: number; totalWage: number; totalNet: number }
    >();

    for (const emp of employees) {
      const dept = emp.department || "General";
      const existing = deptMap.get(dept) || {
        count: 0,
        activeCount: 0,
        totalWage: 0,
        totalNet: 0,
      };
      existing.count += 1;
      if (emp.status === "ACTIVE") existing.activeCount += 1;
      if (emp.payroll) {
        existing.totalWage += Number(emp.payroll.wage);
        existing.totalNet += Number(emp.payroll.netPayable);
      }
      deptMap.set(dept, existing);
    }

    const departmentSummary = Array.from(deptMap.entries()).map(
      ([department, stats]) => ({
        department,
        headcount: stats.count,
        activeHeadcount: stats.activeCount,
        totalWageCTC: Math.round(stats.totalWage),
        totalNetPayable: Math.round(stats.totalNet),
        averageWage:
          stats.count > 0 ? Math.round(stats.totalWage / stats.count) : 0,
      })
    );

    // 2. Leave Type Distribution
    const leaveMap = new Map<string, { count: number; totalDays: number; approvedCount: number }>();
    for (const l of leaves) {
      const existing = leaveMap.get(l.leaveType) || { count: 0, totalDays: 0, approvedCount: 0 };
      existing.count += 1;
      existing.totalDays += l.totalDays;
      if (l.status === "APPROVED") existing.approvedCount += 1;
      leaveMap.set(l.leaveType, existing);
    }

    const leaveDistribution = Array.from(leaveMap.entries()).map(([type, stats]) => ({
      leaveType: type,
      totalRequests: stats.count,
      totalDaysRequested: stats.totalDays,
      approvedRequests: stats.approvedCount,
    }));

    // 3. Attendance Trends (Grouped by date)
    const attendanceDateMap = new Map<
      string,
      { present: number; onLeave: number; absent: number; total: number }
    >();

    for (const a of recentAttendance) {
      const dateStr = a.date.toISOString().split("T")[0];
      const existing = attendanceDateMap.get(dateStr) || {
        present: 0,
        onLeave: 0,
        absent: 0,
        total: 0,
      };
      existing.total += 1;
      if (a.status === "PRESENT" || a.status === "HALF_DAY") existing.present += 1;
      else if (a.status === "ON_LEAVE") existing.onLeave += 1;
      else if (a.status === "ABSENT") existing.absent += 1;
      attendanceDateMap.set(dateStr, existing);
    }

    const attendanceTrends = Array.from(attendanceDateMap.entries())
      .map(([date, stats]) => ({
        date,
        present: stats.present,
        onLeave: stats.onLeave,
        absent: stats.absent,
        total: stats.total,
        attendanceRate:
          stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 4. Payroll Total Expenses Breakdown
    const payrollExpenseBreakdown = {
      totalWage: Math.round(payrolls.reduce((sum, p) => sum + Number(p.wage), 0)),
      totalBasic: Math.round(payrolls.reduce((sum, p) => sum + Number(p.basicSalary), 0)),
      totalHra: Math.round(payrolls.reduce((sum, p) => sum + Number(p.hra), 0)),
      totalStandardAllowance: Math.round(
        payrolls.reduce((sum, p) => sum + Number(p.standardAllowance), 0)
      ),
      totalPerformanceBonus: Math.round(
        payrolls.reduce((sum, p) => sum + Number(p.performanceBonus), 0)
      ),
      totalLta: Math.round(payrolls.reduce((sum, p) => sum + Number(p.lta), 0)),
      totalFixedAllowance: Math.round(
        payrolls.reduce((sum, p) => sum + Number(p.fixedAllowance), 0)
      ),
      totalPfEmployee: Math.round(
        payrolls.reduce((sum, p) => sum + Number(p.pfEmployee), 0)
      ),
      totalPfEmployer: Math.round(
        payrolls.reduce((sum, p) => sum + Number(p.pfEmployer), 0)
      ),
      totalProfessionalTax: Math.round(
        payrolls.reduce((sum, p) => sum + Number(p.professionalTax), 0)
      ),
      totalNetPayable: Math.round(
        payrolls.reduce((sum, p) => sum + Number(p.netPayable), 0)
      ),
    };

    return NextResponse.json({
      success: true,
      data: {
        departmentSummary,
        leaveDistribution,
        attendanceTrends,
        payrollExpenseBreakdown,
      },
    });
  } catch (error) {
    console.error("Analytics summary error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
