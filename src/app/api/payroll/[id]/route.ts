import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { updateWageSchema } from "@/lib/validations/payroll";
import { computeSalaryBreakdown } from "@/lib/salary";
import type { SalaryConfigInput } from "@/lib/salary";

// PATCH /api/payroll/[id] — Admin/HR updates wage and recomputes all salary components
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN", "HR"]);
    const { id } = await params;

    const body = await request.json();
    const parsed = updateWageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { wage } = parsed.data;

    // Find the payroll record
    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeId: true },
        },
      },
    });

    if (!payroll) {
      return NextResponse.json(
        { error: "Payroll record not found." },
        { status: 404 }
      );
    }

    // Get salary config
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

    // Recompute salary breakdown
    let breakdown;
    try {
      breakdown = computeSalaryBreakdown(wage, salaryConfig);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid wage for salary computation.",
        },
        { status: 400 }
      );
    }

    // Update payroll record
    const updated = await prisma.payroll.update({
      where: { id },
      data: {
        wage: breakdown.wage,
        basicSalary: breakdown.basicSalary,
        hra: breakdown.hra,
        standardAllowance: breakdown.standardAllowance,
        performanceBonus: breakdown.performanceBonus,
        lta: breakdown.lta,
        fixedAllowance: breakdown.fixedAllowance,
        pfEmployee: breakdown.pfEmployee,
        pfEmployer: breakdown.pfEmployer,
        professionalTax: breakdown.professionalTax,
        netPayable: breakdown.netPayable,
      },
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeId: true },
        },
      },
    });

    return NextResponse.json({
      message: `Wage updated for ${updated.employee.firstName} ${updated.employee.lastName}. All components recomputed.`,
      payroll: updated,
      breakdown,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Payroll update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/payroll/[id] — Admin can view a specific payroll record
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN", "HR"]);
    const { id } = await params;

    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
            designation: true,
          },
        },
      },
    });

    if (!payroll) {
      return NextResponse.json(
        { error: "Payroll record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ payroll });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Payroll get error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
