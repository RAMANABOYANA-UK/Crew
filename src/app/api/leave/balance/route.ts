import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scopeToSelf } from "@/lib/scope";

// GET /api/leave/balance — Employee retrieves remaining leave balances (Admin can pass ?employeeId=)
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const requestedEmployeeId = searchParams.get("employeeId");
    const targetEmployeeId = scopeToSelf(session, requestedEmployeeId);

    if (!targetEmployeeId) {
      return NextResponse.json(
        { success: false, message: "Employee profile not found" },
        { status: 404 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        paidLeaveBalance: true,
        sickLeaveBalance: true,
        unpaidLeaveBalance: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "Employee not found" },
        { status: 404 }
      );
    }

    const { prisma } = await import("@/lib/prisma");

    const TOTAL_PAID_ALLOWANCE = 12;
    const TOTAL_SICK_ALLOWANCE = 6;

    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: employee.id,
        status: "APPROVED",
      },
      select: { leaveType: true, totalDays: true },
    });

    const usedPaid = approvedLeaves
      .filter((l) => l.leaveType === "PAID" || l.leaveType === "CASUAL")
      .reduce((sum, l) => sum + l.totalDays, 0);

    const usedSick = approvedLeaves
      .filter((l) => l.leaveType === "SICK")
      .reduce((sum, l) => sum + l.totalDays, 0);

    const usedUnpaid = approvedLeaves
      .filter((l) => l.leaveType === "UNPAID")
      .reduce((sum, l) => sum + l.totalDays, 0);

    return NextResponse.json({
      success: true,
      data: {
        paidLeaveBalance: Math.max(0, TOTAL_PAID_ALLOWANCE - usedPaid),
        sickLeaveBalance: Math.max(0, TOTAL_SICK_ALLOWANCE - usedSick),
        unpaidLeaveUsed: usedUnpaid,
        allowance: {
          paidTotal: TOTAL_PAID_ALLOWANCE,
          sickTotal: TOTAL_SICK_ALLOWANCE,
          paidUsed: usedPaid,
          sickUsed: usedSick,
        },
      },
    });
  } catch (error) {
    console.error("Fetch leave balance error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
