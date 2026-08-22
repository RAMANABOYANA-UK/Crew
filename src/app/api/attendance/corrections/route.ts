import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { scopeToSelf } from "@/lib/scope";
import { z } from "zod";

const createCorrectionSchema = z.object({
  date: z.string().or(z.date()),
  requestedCheckIn: z.string().optional().nullable(),
  requestedCheckOut: z.string().optional().nullable(),
  reason: z.string().min(5, "Reason must be at least 5 characters long"),
});

// POST /api/attendance/corrections — Employee submits correction request
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const employee = session.employee;

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "Employee profile not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = createCorrectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          data: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { date: rawDate, requestedCheckIn, requestedCheckOut, reason } = parsed.data;

    const date = new Date(rawDate);
    date.setHours(0, 0, 0, 0);

    const checkIn = requestedCheckIn ? new Date(requestedCheckIn) : null;
    const checkOut = requestedCheckOut ? new Date(requestedCheckOut) : null;

    // Check if an existing Attendance record exists for this date
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date,
        },
      },
    });

    const correction = await prisma.attendanceCorrection.create({
      data: {
        employeeId: employee.id,
        attendanceId: existingAttendance?.id || null,
        date,
        requestedCheckIn: checkIn,
        requestedCheckOut: checkOut,
        reason,
        status: "PENDING",
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: correction,
        message: "Attendance correction request submitted for admin review.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Attendance correction submit error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/attendance/corrections — Employee sees own requests, Admin sees all
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();

    const searchParams = req.nextUrl.searchParams;
    const requestedEmployeeId = searchParams.get("employeeId");
    const targetEmployeeId = scopeToSelf(session, requestedEmployeeId);

    const statusFilter = searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (targetEmployeeId) {
      where.employeeId = targetEmployeeId;
    }
    if (statusFilter) {
      where.status = statusFilter;
    }

    const corrections = await prisma.attendanceCorrection.findMany({
      where,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
            designation: true,
          },
        },
        attendance: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: corrections,
    });
  } catch (error) {
    console.error("Attendance correction fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
