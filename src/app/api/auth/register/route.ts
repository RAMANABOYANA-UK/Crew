import { NextResponse } from "next/server";

// POST /api/auth/register — Explicitly forbidden for public signup
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Forbidden. Public self-signup is disabled. Employee accounts can only be created by an HR or Administrator.",
    },
    { status: 403 }
  );
}
