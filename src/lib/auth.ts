/**
 * Auth Helpers for API Routes
 * 
 * Merged P2 + P3 auth: uses P2's User→Employee relation structure
 * with P3's role enforcement utilities.
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";
import { Role } from "@/generated/prisma/client";

// P2's auth helpers

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { clerkId: userId },
    include: { employee: true },
  });
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "ADMIN" && user.role !== "HR") throw new Error("Forbidden");
  return user;
}

export async function syncUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  let user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: { employee: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email,
        role: Role.EMPLOYEE,
        employee: {
          create: {
            firstName: clerkUser.firstName || "New",
            lastName: clerkUser.lastName || "User",
          },
        },
      },
      include: { employee: true },
    });
  }

  return user;
}

export const syncEmployee = syncUser;

// P3's auth helpers (for attendance/leave/payroll routes)

export interface AuthenticatedEmployee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  role: Role;
  department: string | null;
  designation: string | null;
  clerkId: string;
}

/**
 * Get the currently authenticated employee from a request.
 * Uses P2's User→Employee relation.
 */
export async function getCurrentEmployee(): Promise<AuthenticatedEmployee> {
  const { userId } = await auth();

  if (!userId) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized. Please sign in." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { employee: true },
  });

  if (!user || !user.employee) {
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
    clerkId: user.clerkId,
  };
}

/**
 * Require the current user to have one of the specified roles.
 */
export async function requireRole(
  allowedRoles: Role[]
): Promise<AuthenticatedEmployee> {
  const employee = await getCurrentEmployee();

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

/**
 * Require the current user to be either the target employee or an Admin/HR.
 */
export async function requireSameEmployeeOrAdmin(
  targetEmployeeId: string
): Promise<AuthenticatedEmployee> {
  const employee = await getCurrentEmployee();

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