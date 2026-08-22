import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
  profilePicture: z.string().url().optional().or(z.literal("")),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
});

export async function GET() {
  try {
    const employee = await requireAuth();
    return NextResponse.json({ success: true, data: employee });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const employee = await requireAuth();
    const body = await req.json();
    const data = updateSchema.parse(body);

    const isAdmin = employee.role === "ADMIN" || employee.role === "HR";

    const allowedData = isAdmin
      ? data
      : {
          phone: data.phone,
          address: data.address,
          profilePicture: data.profilePicture || undefined,
        };

    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: allowedData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues },
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