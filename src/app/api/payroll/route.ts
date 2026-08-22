import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployee } from "@/lib/auth";
import { computeProratedPayroll, computeSalaryBreakdown } from "@/lib/salary";
import type { SalaryConfigInput } from "@/lib/salary";

// GET /api/payroll — Employee gets their own payroll breakdown (read-only)
export async function GET() {
  try {
    const employee = await getCurrentEmployee();

    const payroll = await prisma.payroll.findUnique({
      where: { employeeId: employee.id },
    });

    if (!payroll) {
      return NextResponse.json(
        { error: "Payroll record not found. Contact your administrator." },
        { status: 404 }
      );
    }

    // Compute payable days from attendance this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthStart.setHours(0, 0, 0, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: employee.id,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    let payableDays = 0;
    for (const att of attendances) {
      if (att.status === "PRESENT") payableDays += 1;
      else if (att.status === "HALF_DAY") payableDays += 0.5;
      else if (att.status === "ON_LEAVE") payableDays += 1; // Paid leave counts
    }

    // Count total working days this month (exclude weekends)
    let totalWorkingDays = 0;
    for (
      let d = new Date(monthStart);
      d <= monthEnd;
      d.setDate(d.getDate() + 1)
    ) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) totalWorkingDays++;
    }

    // Get salary config for proration calculation
    const config = await prisma.salaryConfig.findFirst();
    const salaryConfig: SalaryConfigInput = config
      ? {
          pfEmployeeRate: config.pfEmployeeRate,
          pfEmployerRate: config.pfEmployerRate,
          professionalTax: config.professionalTax,
          standardAllowance: config.standardAllowance,
          performanceBonusRate: config.performanceBonusRate,
          ltaRate: config.ltaRate,
        }
      : {
          pfEmployeeRate: 0.12,
          pfEmployerRate: 0.12,
          professionalTax: 200,
          standardAllowance: 4167,
          performanceBonusRate: 0.0833,
          ltaRate: 0.0833,
        };

    const breakdown = computeSalaryBreakdown(payroll.wage, salaryConfig);
    const proratedNet = computeProratedPayroll(
      breakdown,
      payableDays,
      totalWorkingDays
    );

    return NextResponse.json({
      payroll: {
        ...payroll,
        payableDays: Math.round(payableDays),
        totalWorkingDays,
        proratedNetPayable: proratedNet,
      },
      breakdown,
      attendanceSummary: {
        present: attendances.filter((a) => a.status === "PRESENT").length,
        halfDay: attendances.filter((a) => a.status === "HALF_DAY").length,
        onLeave: attendances.filter((a) => a.status === "ON_LEAVE").length,
        absent: attendances.filter((a) => a.status === "ABSENT").length,
        payableDays: Math.round(payableDays),
        totalWorkingDays,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Payroll fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
