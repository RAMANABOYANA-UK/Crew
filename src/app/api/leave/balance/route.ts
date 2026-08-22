import { NextResponse } from "next/server";
import { getCurrentEmployee } from "@/lib/auth";

// GET /api/leave/balance — Employee retrieves their remaining leave balances
export async function GET() {
  try {
    const employee = await getCurrentEmployee();
    if (!employee) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
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
