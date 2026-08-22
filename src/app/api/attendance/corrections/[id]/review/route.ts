import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const reviewCorrectionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  adminComment: z.string().optional(),
});

// PATCH /api/attendance/corrections/[id]/review — Admin approves or rejects correction
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const body = await req.json();
    const parsed = reviewCorrectionSchema.safeParse(body);

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

    const { status, adminComment } = parsed.data;

    const correction = await prisma.attendanceCorrection.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!correction) {
      return NextResponse.json(
        { success: false, message: "Attendance correction request not found" },
        { status: 404 }
      );
    }

    if (correction.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: `Correction request has already been ${correction.status.toLowerCase()}.`,
        },
        { status: 409 }
      );
    }

    if (status === "APPROVED") {
      const checkIn = correction.requestedCheckIn;
      const checkOut = correction.requestedCheckOut;

      let hoursWorked: number | null = null;
      let attendanceStatus: "PRESENT" | "HALF_DAY" = "PRESENT";

      if (checkIn && checkOut) {
        hoursWorked =
          Math.round(
            ((new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
              (1000 * 60 * 60)) *
              100
          ) / 100;
        if (hoursWorked < 5) {
          attendanceStatus = "HALF_DAY";
        }
      }

      // Upsert the Attendance record
      await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: correction.employeeId,
            date: correction.date,
          },
        },
        update: {
          checkIn,
          checkOut,
          status: attendanceStatus,
          hoursWorked,
          notes: `Corrected via request: ${correction.reason}`,
        },
        create: {
          employeeId: correction.employeeId,
          date: correction.date,
          checkIn,
          checkOut,
          status: attendanceStatus,
          hoursWorked,
          notes: `Corrected via request: ${correction.reason}`,
        },
      });
    }

    const updatedCorrection = await prisma.attendanceCorrection.update({
      where: { id },
      data: {
        status,
        adminComment: adminComment || null,
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      },
    });

    // Notify employee
    if (correction.employee.userId) {
      try {
        const { createNotification } = await import("@/lib/notifications");
        await createNotification({
          userId: correction.employee.userId,
          title: `Attendance Correction ${status}`,
          message: `Your attendance correction request for ${
            correction.date.toISOString().split("T")[0]
          } was ${status.toLowerCase()}.${adminComment ? ` Note: "${adminComment}"` : ""}`,
          type: "SYSTEM",
          link: "/dashboard/attendance",
        });
      } catch (notifyErr) {
        console.error("Failed to notify employee on correction review:", notifyErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedCorrection,
      message: `Attendance correction ${status.toLowerCase()}.`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }
    console.error("Correction review error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
