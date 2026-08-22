import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, generateToken } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { loginId, password } = parsed.data;

    // Search by loginId or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { loginId: { equals: loginId, mode: "insensitive" } },
          { email: { equals: loginId, mode: "insensitive" } },
        ],
      },
      include: {
        employee: true,
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid username/Login ID or password.",
        },
        { status: 401 }
      );
    }

    const isMatch = comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid username/Login ID or password.",
        },
        { status: 401 }
      );
    }

    const token = generateToken({
      userId: user.id,
      loginId: user.loginId || "",
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id,
      mustChangePassword: user.mustChangePassword,
    });

    const response = NextResponse.json({
      success: true,
      message: user.mustChangePassword
        ? "Login successful. You must change your temporary password before accessing the system."
        : "Login successful.",
      token,
      mustChangePassword: user.mustChangePassword,
      isFirstLogin: user.isFirstLogin,
      user: {
        id: user.id,
        loginId: user.loginId,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        employee: user.employee
          ? {
              id: user.employee.id,
              firstName: user.employee.firstName,
              lastName: user.employee.lastName,
              department: user.employee.department,
              designation: user.employee.designation,
              employeeId: user.employee.employeeId,
            }
          : null,
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set("dayflow_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during login" },
      { status: 500 }
    );
  }
}
