/**
 * Auth & Token Helpers for Dayflow HRMS
 * 
 * Supports:
 * 1. Direct credential-based authentication (JWT in httpOnly cookies + bcrypt)
 * 2. Mandatory first-login password change workflow
 * 3. Clerk fallback / interoperability
 * 4. Role-based access control (ADMIN, HR, EMPLOYEE)
 */

import { cookies, headers } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { Role } from "@/generated/prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || process.env.CLERK_SECRET_KEY || "dayflow-hrms-jwt-secret-2026-key";
const COOKIE_NAME = "dayflow_token";

export interface JWTPayload {
  userId: string;
  loginId: string;
  email: string;
  role: Role;
  employeeId?: string;
  mustChangePassword?: boolean;
}

// ─── Token Utilities ────────────────────────────────────

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

// ─── Password Utilities ─────────────────────────────────

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// ─── User & Employee Resolution ─────────────────────────

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

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized. Please sign in." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "ADMIN" && user.role !== "HR") {
    throw new Response(
      JSON.stringify({ error: "Forbidden. Admin or HR privileges required." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  return user;
}

export interface AuthenticatedEmployee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  role: Role;
  department: string | null;
  designation: string | null;
  loginId: string;
  email: string;
  mustChangePassword: boolean;
  clerkId?: string | null;
}

export async function getCurrentEmployee(): Promise<AuthenticatedEmployee> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized. Please sign in." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!user.employee) {
    throw new Response(
      JSON.stringify({ error: "Employee profile not found. Contact your administrator." }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  return {
    id: user.employee.id,
    userId: user.id,
    firstName: user.employee.firstName,
    lastName: user.employee.lastName,
    role: user.role,
    department: user.employee.department,
    designation: user.employee.designation,
    loginId: user.loginId || user.employee.loginId || "",
    email: user.email,
    mustChangePassword: user.mustChangePassword,
    clerkId: user.clerkId,
  };
}

export async function requireRole(
  allowedRoles: Role[],
  allowFirstLogin = false
): Promise<AuthenticatedEmployee> {
  const employee = await getCurrentEmployee();

  // Enforce mandatory password change before accessing app features
  if (employee.mustChangePassword && !allowFirstLogin) {
    throw new Response(
      JSON.stringify({
        error: "Password change required. You must change your temporary password before accessing the application.",
        mustChangePassword: true,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!allowedRoles.includes(employee.role)) {
    throw new Response(
      JSON.stringify({
        error: "Forbidden. You do not have permission to access this resource.",
        requiredRoles: allowedRoles,
        yourRole: employee.role,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return employee;
}

export async function requireSameEmployeeOrAdmin(
  targetEmployeeId: string
): Promise<AuthenticatedEmployee> {
  const employee = await getCurrentEmployee();

  if (employee.mustChangePassword) {
    throw new Response(
      JSON.stringify({
        error: "Password change required. You must change your temporary password before accessing your profile.",
        mustChangePassword: true,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const isAdmin = employee.role === "ADMIN" || employee.role === "HR";
  const isSameEmployee = employee.id === targetEmployeeId;

  if (!isAdmin && !isSameEmployee) {
    throw new Response(
      JSON.stringify({ error: "Forbidden. You can only access your own records." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return employee;
}

export function isAdminOrHR(role: Role): boolean {
  return role === "ADMIN" || role === "HR";
}

// ─── Clerk sync helper (compatibility) ───────────────────

export async function syncUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  let user = await prisma.user.findUnique({
    where: { email },
    include: { employee: true },
  });

  if (!user) {
    const firstName = clerkUser.firstName || "New";
    const lastName = clerkUser.lastName || "User";
    const year = new Date().getFullYear();
    const loginId = `OI${firstName.slice(0, 2).toUpperCase()}${lastName.slice(0, 2).toUpperCase()}${year}0001`;

    user = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        loginId,
        email,
        role: Role.EMPLOYEE,
        mustChangePassword: true,
        isFirstLogin: true,
        employee: {
          create: {
            loginId,
            firstName,
            lastName,
            email,
          },
        },
      },
      include: { employee: true },
    });
  } else if (!user.clerkId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { clerkId: clerkUser.id },
      include: { employee: true },
    });
  }

  return user;
}

export const syncEmployee = syncUser;