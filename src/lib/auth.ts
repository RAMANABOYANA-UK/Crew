/**
 * Auth & Token Helpers for Dayflow HRMS
 *
 * Supports both Clerk authentication and standard JWT/bcrypt credentials (pure Prisma).
 */

import { cookies, headers } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// ─── JWT / Password Utilities ────────────────────

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.CLERK_SECRET_KEY ||
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
 * Resolves current User (JWT token first, Clerk fallback second)
 */
export async function getCurrentUser() {
  // 1. Try JWT Auth
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

  // 2. Try Clerk Auth fallback
  try {
    const { userId } = await auth();
    if (userId) {
      return prisma.user.findUnique({
        where: { clerkId: userId },
        include: { employee: true },
      });
    }
  } catch {
    // Clerk not configured or error
  }

  return null;
}

/**
 * Resolves current Employee (Clerk auth first, JWT token fallback second)
 */
export async function getCurrentEmployee() {
  // 1. Try Clerk Auth
  try {
    const { userId } = await auth();
    if (userId) {
      const employee = await prisma.employee.findUnique({
        where: { clerkUserId: userId },
        include: { user: true },
      });
      if (employee) return employee;
    }
  } catch {
    // Clerk not configured or error
  }

  // 2. Try JWT Token Auth
  const user = await getCurrentUser();
  if (user?.employee) {
    return user.employee;
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
    if (employee) return employee;
  }

  return null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  const employee = await getCurrentEmployee();

  if (!user && !employee) {
    throw new Error("Unauthorized");
  }

  return {
    ...(user || {}),
    user: user || undefined,
    employee: employee || user?.employee || null,
    role: employee?.role || user?.role || "EMPLOYEE",
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

export async function syncEmployee() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  let employee = await prisma.employee.findUnique({
    where: { clerkUserId: clerkUser.id },
  });

  if (!employee) {
    const firstName = clerkUser.firstName || "New";
    const lastName = clerkUser.lastName || "User";
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);

    const loginId = `OI${firstName.slice(0, 2).toUpperCase()}${lastName
      .slice(0, 2)
      .toUpperCase()}${year}${random}`;
    const employeeId = `EMP${Date.now().toString().slice(-4)}`;

    employee = await prisma.employee.create({
      data: {
        clerkUserId: clerkUser.id,
        loginId,
        employeeId,
        email,
        firstName,
        lastName,
        role: "EMPLOYEE",
        status: "ACTIVE",
        dateOfJoining: new Date(),
        joinDate: new Date(),
      },
    });
  }

  return employee;
}

export const syncUser = syncEmployee;