import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { scanPayrollAnomalies, persistDetectedAnomalies } from "@/lib/payroll-anomalies";
import { prisma } from "@/lib/prisma";

// GET /api/payroll/anomalies — Scan and list payroll anomalies (Admin/HR only)
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const shouldRescan = searchParams.get("rescan") === "true";
    const status = searchParams.get("status"); // "resolved" | "unresolved"

    if (shouldRescan) {
      await persistDetectedAnomalies();
    }

    const liveAnomalies = await scanPayrollAnomalies();

    const dbAnomalies = await prisma.payrollAnomaly.findMany({
      where: {
        ...(status === "resolved" ? { isResolved: true } : {}),
        ...(status === "unresolved" ? { isResolved: false } : {}),
      },
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

    return NextResponse.json({
      success: true,
      data: {
        liveDiscrepancies: liveAnomalies,
        recordedAnomalies: dbAnomalies,
        summary: {
          totalLive: liveAnomalies.length,
          totalRecorded: dbAnomalies.length,
          unresolvedCount: dbAnomalies.filter((a) => !a.isResolved).length,
        },
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Fetch payroll anomalies error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/payroll/anomalies — Resolve an anomaly
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { id, isResolved = true } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Anomaly ID is required" },
        { status: 400 }
      );
    }

    const updated = await prisma.payrollAnomaly.update({
      where: { id },
      data: { isResolved },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Anomaly marked as ${isResolved ? "resolved" : "unresolved"}.`,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Resolve anomaly error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
