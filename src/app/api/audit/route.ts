import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/audit — Query immutable audit logs (Admin/HR only)
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const actorId = searchParams.get("actorId");
    const actorEmail = searchParams.get("actorEmail");
    const action = searchParams.get("action");
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      AND: [
        actorId ? { actorId } : {},
        actorEmail ? { actorEmail: { contains: actorEmail, mode: "insensitive" } } : {},
        action ? { action } : {},
        entityType ? { entityType } : {},
        entityId ? { entityId } : {},
        startDate ? { createdAt: { gte: new Date(startDate) } } : {},
        endDate ? { createdAt: { lte: new Date(endDate) } } : {},
      ],
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      meta: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Audit query error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
