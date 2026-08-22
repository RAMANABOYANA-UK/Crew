/**
 * Pure JWT & Bcrypt Auth Helpers for Dayflow HRMS
 */

import { cookies, headers } from "next/headers";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// ─── JWT / Password Utilities ────────────────────

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "dayflow-hrms-jwt-secret-2026-key";
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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
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

// ─── User & Employee Resolution ────────────────────

/**
 * Resolves current User from JWT Token
 */
export async function getCurrentUser() {
  const token = await getAuthToken();
  if (token) {
    const payload = verifyToken(token);
    if (payload?.userId) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: { employee: true },
      });
      if (user) return user;
    }
  }
  return null;
}

/**
 * Resolves current Employee from JWT Token
 */
export async function getCurrentEmployee() {
  const user = await getCurrentUser();
  if (user?.employee) {
    return { ...user.employee, user };
  }
  if (user) {
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { userId: user.id },
          { email: user.email },
          ...(user.loginId ? [{ loginId: user.loginId }] : []),
        ],
      },
      include: { user: true },
    });
    if (employee) return { ...employee, user };
  }
  return null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  const employee = await getCurrentEmployee();

  if (!user && !employee) {
    throw new Error("Unauthorized");
  }

  const effectiveUser = user || (employee ? (employee as unknown as { user: typeof user }).user : null);
  return {
    ...(effectiveUser || {}),
    id: effectiveUser?.id || employee?.userId || employee?.id || "",
    email: effectiveUser?.email || employee?.email || "",
    user: effectiveUser || undefined,
    employee: employee || user?.employee || null,
    role: effectiveUser?.role || "EMPLOYEE",
  };
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "ADMIN" && user.role !== "HR") {
    throw new Error("Forbidden");
  }
  return user;
}

export async function requireRole(allowedRoles: string | string[]) {
  const user = await requireAuth();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}