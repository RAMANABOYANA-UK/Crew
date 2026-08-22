/**
 * Auth & Token Helpers for Dayflow HRMS
 *
 * 100% Pure Prisma & JWT / bcrypt authentication.
 */

import { cookies, headers } from "next/headers";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const JWT_SECRET =
  process.env.JWT_SECRET || "dayflow-hrms-jwt-secret-2026-key";
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

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const role = user.employee?.role || user.role || "EMPLOYEE";

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
    throw new Error("Forbidden");
  }
  return session;
}

export async function requireRole(allowedRoles: string | string[]) {
  const session = await requireAuth();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(session.role)) {
    throw new Error("Forbidden");
  }
  return session;
}