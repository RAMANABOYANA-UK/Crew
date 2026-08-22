import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { updateSalaryConfigSchema } from "@/lib/validations/payroll";

// GET /api/payroll/config — Admin/HR gets current salary configuration
export async function GET() {
  try {
    await requireRole(["ADMIN", "HR"]);

    const config = await prisma.salaryConfig.findFirst();

    if (!config) {
      // Return defaults if no config record exists
      return NextResponse.json({
        config: {
          pfEmployeeRate: 0.12,
          pfEmployerRate: 0.12,
          professionalTax: 200,
          standardAllowance: 4167,
          performanceBonusRate: 0.0833,
          ltaRate: 0.0833,
        },
        isDefault: true,
      });
    }

    return NextResponse.json({ config, isDefault: false });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Config fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/payroll/config — Admin/HR updates salary configuration
export async function PATCH(request: NextRequest) {
  try {
    await requireRole(["ADMIN", "HR"]);

    const body = await request.json();
    const parsed = updateSalaryConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Upsert — create if doesn't exist, update if it does
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

    return NextResponse.json({
      message: "Salary configuration updated.",
      config,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Config update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
