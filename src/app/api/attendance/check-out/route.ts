import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployee } from "@/lib/auth";

// POST /api/attendance/check-out — Employee checks out for today
export async function POST(request: NextRequest) {
  try {
    const employee = await getCurrentEmployee();
    if (!employee) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today,
        },
      },
    });

    if (!attendance) {
      return NextResponse.json(
        { error: "No check-in found for today. Please check in first." },
        { status: 404 }
      );
    }

    if (attendance.checkOut) {
      return NextResponse.json(
        { error: "Already checked out today.", attendance },
        { status: 409 }
      );
    }

    const checkOut = new Date();
    const checkIn = attendance.checkIn!;
    const hoursWorked =
      Math.round(
        ((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)) * 100
      ) / 100;

    const body = await request.json().catch(() => ({}));

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut,
        hoursWorked,
        notes: body.notes || attendance.notes,
      },
    });

    return NextResponse.json({
      message: "Checked out successfully.",
      attendance: updated,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Check-out error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
