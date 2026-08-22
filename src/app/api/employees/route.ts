import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department");

    const employees = await prisma.employee.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { firstName: { contains: search, mode: "insensitive" } },
                  { lastName: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                  { employeeId: { contains: search, mode: "insensitive" } },
                  { loginId: { contains: search, mode: "insensitive" } },
                ],
              }
            : {},
          department ? { department } : {},
        ],
      },
      include: {
        user: {
          select: {
            email: true,
            role: true,
            loginId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: employees });
  } catch {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 }
    );
  }
}