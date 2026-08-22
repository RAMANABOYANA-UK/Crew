import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// GET /api/leave/all — Admin/HR gets all leave requests
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get("status");
    const employeeId = searchParams.get("employeeId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (statusFilter) {
      where.status = statusFilter;
    }
    if (employeeId) {
      where.employeeId = employeeId;
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
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
      },
      orderBy: { createdAt: "desc" },
    });

    const summary = {
      total: leaveRequests.length,
      pending: leaveRequests.filter((l) => l.status === "PENDING").length,
      approved: leaveRequests.filter((l) => l.status === "APPROVED").length,
      rejected: leaveRequests.filter((l) => l.status === "REJECTED").length,
    };

    return NextResponse.json({ leaveRequests, summary });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("All leaves fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
