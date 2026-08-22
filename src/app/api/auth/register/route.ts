import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const registerSchema = z
  .object({
    loginId: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    role: z.undefined({
      message: "Specifying role during public registration is strictly forbidden.",
    }),
  })
  .strict();

// POST /api/auth/register — Public self-registration (hard-coded EMPLOYEE role)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate that role field is strictly ABSENT
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed. Public registration cannot grant elevated roles.",
          data: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Public self-signup is disabled for this organization. Employee accounts must be provisioned by an Administrator or HR.",
      },
      { status: 403 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid request payload.",
      },
      { status: 400 }
    );
  }
}
