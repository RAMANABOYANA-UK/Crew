import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// GET /api/action-center — Admin unified queue of pending leave & attendance correction requests
export async function GET() {
  try {
    await requireAdmin();

    const [pendingLeaves, pendingCorrections] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: { status: "PENDING" },
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              department: true,
              designation: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.attendanceCorrection.findMany({
        where: { status: "PENDING" },
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              department: true,
              designation: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const items = [
      ...pendingLeaves.map((l) => ({
        type: "LEAVE" as const,
        id: l.id,
        employee: l.employee,
        leaveType: l.leaveType,
        totalDays: l.totalDays,
        startDate: l.startDate,
        endDate: l.endDate,
        reason: l.reason,
        summary: `${l.leaveType} Leave · ${l.totalDays} day(s)`,
        createdAt: l.createdAt,
      })),
      ...pendingCorrections.map((c) => ({
        type: "CORRECTION" as const,
        id: c.id,
        employee: c.employee,
        date: c.date,
        requestedCheckIn: c.requestedCheckIn,
        requestedCheckOut: c.requestedCheckOut,
        reason: c.reason,
        summary: `Attendance Correction for ${c.date.toISOString().split("T")[0]}`,
        createdAt: c.createdAt,
      })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: {
        totalPendingItems: items.length,
        pendingLeavesCount: pendingLeaves.length,
        pendingCorrectionsCount: pendingCorrections.length,
        items,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }
    console.error("Action center fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
