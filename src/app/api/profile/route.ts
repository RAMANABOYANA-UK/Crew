import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const updateSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
  profile_picture: z.string().url().optional().or(z.literal("")),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  basic_salary: z.number().optional(),
  hra: z.number().optional(),
  allowances: z.number().optional(),
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
          profile_picture: data.profile_picture || undefined,
        };

    const { data: updated, error } = await supabase
      .from("employees")
      .update(allowedData)
      .eq("id", employee.id)
      .select()
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json(
        { success: false, message: "Update failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
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