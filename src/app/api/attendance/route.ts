import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { scopeToSelf } from "@/lib/scope";

// GET /api/attendance — Employee gets their own attendance, Admin gets scoped/filtered
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

    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Default to current month if no dates provided
    const now = new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endDateParam
      ? new Date(endDateParam)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: targetEmployeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "desc" },
    });

    // Compute summary
    const summary = {
      total: attendances.length,
      present: attendances.filter((a) => a.status === "PRESENT").length,
      absent: attendances.filter((a) => a.status === "ABSENT").length,
      halfDay: attendances.filter((a) => a.status === "HALF_DAY").length,
      onLeave: attendances.filter((a) => a.status === "ON_LEAVE").length,
      totalHoursWorked: attendances.reduce(
        (sum, a) => sum + (a.hoursWorked || 0),
        0
      ),
    };

    return NextResponse.json({
      success: true,
      data: { attendances, summary },
    });
  } catch (error) {
    console.error("Attendance fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
