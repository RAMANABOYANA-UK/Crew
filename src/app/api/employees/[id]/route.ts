import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            role: true,
            loginId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: employee });
  } catch {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 }
    );
  }
}