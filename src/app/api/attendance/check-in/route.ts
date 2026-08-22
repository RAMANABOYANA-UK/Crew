import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployee } from "@/lib/auth";

// POST /api/attendance/check-in — Employee checks in for today
export async function POST(request: NextRequest) {
  try {
    const employee = await getCurrentEmployee();
    if (!employee) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

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
        {
          success: false,
          message: "Already checked in today.",
          data: existing,
        },
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
      {
        success: true,
        data: attendance,
        message: "Checked in successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
