import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireRole } from "@/lib/auth";
import { updateSalaryConfigSchema } from "@/lib/validations/payroll";

// GET /api/payroll/config — Admin/HR gets current salary configuration
export async function GET() {
  try {
    await requireAdmin();

    const config = await prisma.salaryConfig.findFirst();

    if (!config) {
      // Return defaults if no config record exists
      return NextResponse.json({
        success: true,
        data: {
          config: {
            pfEmployeeRate: 0.12,
            pfEmployerRate: 0.12,
            professionalTax: 200,
            standardAllowance: 4167,
            performanceBonusRate: 0.0833,
            ltaRate: 0.0833,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { config },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }
    console.error("Salary config fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/payroll/config — Admin/HR updates salary configuration rules
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const body = await request.json();
    const parsed = updateSalaryConfigSchema.safeParse(body);

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

    const existing = await prisma.salaryConfig.findFirst();

    let config;
    if (existing) {
      config = await prisma.salaryConfig.update({
        where: { id: existing.id },
        data: parsed.data,
      });
    } else {
      config = await prisma.salaryConfig.create({
        data: {
          pfEmployeeRate: parsed.data.pfEmployeeRate ?? 0.12,
          pfEmployerRate: parsed.data.pfEmployerRate ?? 0.12,
          professionalTax: parsed.data.professionalTax ?? 200,
          standardAllowance: parsed.data.standardAllowance ?? 4167,
          performanceBonusRate: parsed.data.performanceBonusRate ?? 0.0833,
          ltaRate: parsed.data.ltaRate ?? 0.0833,
        },
      });
    }

    // Record immutable audit entry
    try {
      const { logAuditEvent } = await import("@/lib/audit");
      await logAuditEvent({
        actorId: admin.id,
        actorEmail: admin.email,
        action: "SALARY_CONFIG_UPDATED",
        entityType: "SalaryConfig",
        entityId: config.id,
        oldValues: existing || undefined,
        newValues: parsed.data,
      });
    } catch (auditErr) {
      console.error("Failed to write audit log for salary config update:", auditErr);
    }

    return NextResponse.json({
      success: true,
      data: config,
      message: "Salary configuration updated successfully.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }
    console.error("Salary config update error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
