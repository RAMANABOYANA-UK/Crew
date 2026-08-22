import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// GET /api/leave/pending — Admin/HR gets pending leave requests (approval queue)
export async function GET() {
  try {
    await requireAdmin();

    const pendingLeaves = await prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
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
      },
      orderBy: { createdAt: "asc" }, // FIFO — oldest first
    });

    return NextResponse.json({
      leaveRequests: pendingLeaves,
      total: pendingLeaves.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Pending leaves error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
