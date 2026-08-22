import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
  profilePic: z.string().url().optional().or(z.literal("")),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  basicSalary: z.number().optional(),
  hra: z.number().optional(),
  allowances: z.number().optional(),
});

export async function GET() {
  try {
    const user = await requireAuth();
    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = updateSchema.parse(body);

    const isAdmin = user.role === "ADMIN" || user.role === "HR";

    const allowedData = isAdmin
      ? data
      : {
          phone: data.phone,
          address: data.address,
          profilePic: data.profilePic || undefined,
        };

    if (!user.employee) {
      return NextResponse.json(
        { success: false, message: "Employee profile not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.employee.update({
      where: { id: user.employee.id },
      data: allowedData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, message: error.errors },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Update failed" },
      { status: 500 }
    );
  }
}