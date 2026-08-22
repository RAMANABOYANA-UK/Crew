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

    return NextResponse.json({
      success: true,
      data: {
        employeeId: employee.id,
        paidLeaveBalance: employee.paidLeaveBalance ?? 12,
        sickLeaveBalance: employee.sickLeaveBalance ?? 6,
        unpaidLeaveBalance: employee.unpaidLeaveBalance ?? 0,
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
