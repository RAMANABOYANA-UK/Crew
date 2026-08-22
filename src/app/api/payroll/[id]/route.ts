import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireRole } from "@/lib/auth";
import { updateWageSchema } from "@/lib/validations/payroll";
import { computeSalaryBreakdown, DEFAULT_SALARY_CONFIG } from "@/lib/salary";
import type { SalaryConfigInput } from "@/lib/salary";

// PATCH /api/payroll/[id] — Admin/HR updates wage and recomputes all salary components
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const parsed = updateWageSchema.safeParse(body);

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

    const { wage } = parsed.data;

    // Find the payroll record
    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!payroll) {
      return NextResponse.json(
        { success: false, message: "Payroll record not found." },
        { status: 404 }
      );
    }

    // Fetch active salary config (or use defaults)
    const activeConfig = await prisma.salaryConfig.findFirst({
      orderBy: { createdAt: "desc" },
    });

    const config: SalaryConfigInput = activeConfig
      ? {
          pfEmployeeRate: activeConfig.pfEmployeeRate,
          pfEmployerRate: activeConfig.pfEmployerRate,
          professionalTax: activeConfig.professionalTax,
          standardAllowance: activeConfig.standardAllowance,
          performanceBonusRate: activeConfig.performanceBonusRate,
          ltaRate: activeConfig.ltaRate,
        }
      : DEFAULT_SALARY_CONFIG;

    // Recompute salary breakdown with new wage
    const breakdown = computeSalaryBreakdown(wage, config);

    // Update payroll record and employee basicSalary
    const [updatedPayroll] = await prisma.$transaction([
      prisma.payroll.update({
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
      }),
      prisma.employee.update({
        where: { id: payroll.employeeId },
        data: {
          basicSalary: breakdown.basicSalary,
          hra: breakdown.hra,
          allowances: breakdown.fixedAllowance,
        },
      }),
    ]);

    // Record immutable audit entry
    try {
      const { logAuditEvent } = await import("@/lib/audit");
      await logAuditEvent({
        actorId: admin.id,
        actorEmail: admin.email,
        action: "WAGE_UPDATED",
        entityType: "Payroll",
        entityId: payroll.id,
        oldValues: { wage: Number(payroll.wage), netPayable: Number(payroll.netPayable) },
        newValues: { wage: breakdown.wage, netPayable: breakdown.netPayable },
      });
    } catch (auditErr) {
      console.error("Failed to write audit log for wage update:", auditErr);
    }

    return NextResponse.json({
      success: true,
      data: updatedPayroll,
      message: "Wage updated and salary recomputed successfully.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }
    console.error("Wage update error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/payroll/[id] — Retrieve single payroll record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
            designation: true,
            email: true,
          },
        },
      },
    });

    if (!payroll) {
      return NextResponse.json(
        { success: false, message: "Payroll record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: payroll,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }
    console.error("Payroll fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
