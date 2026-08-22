import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// GET /api/payroll/all — Admin/HR gets all payroll records
export async function GET() {
  try {
    await requireAdmin();

    const payrolls = await prisma.payroll.findMany({
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
            designation: true,
            loginId: true,
          },
        },
      },
      orderBy: {
        employee: {
          firstName: "asc",
        },
      },
    });

    const totalWageExpense = payrolls.reduce((sum, p) => sum + p.wage, 0);
    const totalNetPayable = payrolls.reduce((sum, p) => sum + p.netPayable, 0);

    return NextResponse.json({
      success: true,
      data: {
        payrolls,
        summary: {
          totalEmployees: payrolls.length,
          totalWageExpense,
          totalNetPayable,
        },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }
    console.error("All payroll fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
