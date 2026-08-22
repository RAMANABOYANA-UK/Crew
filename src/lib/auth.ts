/**
 * Auth, Token, & Authorization Helpers for Dayflow HRMS
 *
 * 100% Pure Prisma & JWT / bcrypt authentication.
 */

import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// Custom Auth Error with Status Code (401 / 403)
export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

// Harden JWT Secret Resolution
let devWarned = false;
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL: JWT_SECRET environment variable is missing in production!"
      );
    }
    if (!devWarned) {
      console.warn(
        "⚠️ WARNING: JWT_SECRET is not set in environment. Falling back to default key for development."
      );
      devWarned = true;
    }
    return "dayflow-hrms-jwt-secret-2026-key";
  }
  return secret;
}

const COOKIE_NAME = "dayflow_token";

export interface JWTPayload {
  userId: string;
  loginId: string;
  email: string;
  role: string;
  employeeId?: string;
  mustChangePassword?: boolean;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) return token;
  } catch {
    // Cookies not available
  }

  try {
    const headerStore = await headers();
    const authHeader = headerStore.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }
  } catch {
    // Headers not available
  }

  return null;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export async function getCurrentUser() {
  const token = await getAuthToken();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload?.userId) return null;

  return prisma.user.findUnique({
    where: { id: payload.userId },
    include: { employee: true },
  });
}

export async function getCurrentEmployee() {
  const user = await getCurrentUser();
  if (user?.employee) {
    return user.employee;
  }
  if (user) {
    return prisma.employee.findFirst({
      where: {
        OR: [
          { userId: user.id },
          { email: user.email },
          ...(user.loginId ? [{ loginId: user.loginId }] : []),
        ],
      },
      include: { user: true },
    });
  }
  return null;
}

// Single Source of Truth: User.role is the sole source of truth for authorization
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError(401, "Unauthorized");
  }

  // Sole source of truth: user.role
  const role = user.role;

  return {
    id: user.id,
    loginId: user.loginId,
    email: user.email,
    role,
    mustChangePassword: user.mustChangePassword,
    isFirstLogin: user.isFirstLogin,
    user,
    employee: user.employee || null,
  };
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.role !== "ADMIN" && session.role !== "HR") {
    throw new AuthError(403, "Forbidden");
  }
  return session;
}

export async function requireRole(allowedRoles: string | string[]) {
  const session = await requireAuth();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(session.role)) {
    throw new AuthError(403, "Forbidden");
  }
  return session;
}

// Role lives exclusively on User model (single source of truth)
export async function syncEmployeeRole(_userId: string, _role: "ADMIN" | "HR" | "EMPLOYEE") {
  // No-op: Role lives only on User model
}

// Standardized API Error Handler
export function handleApiError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.status }
    );
  }
  console.error("API Error:", error);
  return NextResponse.json(
    { success: false, message: "Internal server error" },
    { status: 500 }
  );
}