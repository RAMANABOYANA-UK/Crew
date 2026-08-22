import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, comparePassword, hashPassword, generateToken } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);

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

    const { currentPassword, newPassword } = parsed.data;

    // Fetch user with password hash
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { employee: true },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, error: "User account not found or has no password configured." },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentValid = comparePassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Current password is incorrect.",
        },
        { status: 400 }
      );
    }

    // Update password and clear mustChangePassword / isFirstLogin flags
    const newHash = hashPassword(newPassword);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        isFirstLogin: false,
      },
      include: { employee: true },
    });

    // Generate new token reflecting updated password status
    const token = generateToken({
      userId: updatedUser.id,
      loginId: updatedUser.loginId || "",
      email: updatedUser.email,
      role: updatedUser.role,
      employeeId: updatedUser.employee?.id,
      mustChangePassword: false,
    });

    const response = NextResponse.json({
      success: true,
      message: "Password changed successfully. You now have full access to Dayflow HRMS.",
      token,
      mustChangePassword: false,
    });

    // Update the auth cookie
    response.cookies.set("dayflow_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error while changing password" },
      { status: 500 }
    );
  }
}
