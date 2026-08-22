/**
 * Auth & Token Helpers for Dayflow HRMS
 *
 * Primary flow: Clerk authentication mapped directly to Employee.clerkUserId (Prisma-only).
 * Retained utilities: JWT/bcrypt helpers used by the credential-based onboarding
 * and first-login password change workflow.
 */

import { cookies, headers } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// ─── Clerk-based helpers (canonical) ────────────────────

export async function getCurrentEmployee() {
  const { userId } = await auth();
  if (!userId) return null;

  return prisma.employee.findUnique({
    where: { clerkUserId: userId },
  });
}

export async function requireAuth() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    throw new Error("Unauthorized");
  }
  return employee;
}

export async function requireAdmin() {
  const employee = await requireAuth();
  if (employee.role !== "ADMIN" && employee.role !== "HR") {
    throw new Error("Forbidden");
  }
  return employee;
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
      },
    });
  }

  return employee;
}

// Alias
export const syncUser = syncEmployee;

// ─── JWT / password utilities (credential onboarding) ───

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
  // 1. Check cookies
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) return token;
  } catch {
    // Cookies may not be accessible in all contexts
  }

  // 2. Check Authorization header
  try {
    const headerStore = await headers();
    const authHeader = headerStore.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }
  } catch {
    // Headers may not be accessible in all contexts
  }

  return null;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

/**
 * Resolve the credential-based User account (JWT cookie/header first,
 * Clerk fallback second). Used by the password onboarding workflow.
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
    // Clerk not configured or in testing environment
  }

  return null;
}