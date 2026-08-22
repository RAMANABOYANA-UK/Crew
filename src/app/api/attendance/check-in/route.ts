import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployee } from "@/lib/auth";

// POST /api/attendance/check-in — Employee checks in for today
export async function POST(request: NextRequest) {
  try {
    const employee = await getCurrentEmployee();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Already checked in today.", attendance: existing },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const attendance = await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        date: today,
        checkIn: new Date(),
        status: "PRESENT",
        notes: body.notes || null,
      },
    });

    return NextResponse.json(
      { message: "Checked in successfully.", attendance },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Check-in error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
