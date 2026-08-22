/**
 * Auth Helpers for API Routes
 * 
 * Extracts the current user from Clerk, looks up the Employee record,
 * and provides role-checking utilities for server-side authorization.
 */

import { auth } from "@clerk/nextjs/server";
import { prisma } from "./prisma";
import type { Role } from "@/generated/prisma/client";

export interface AuthenticatedEmployee {
  id: string;
  clerkUserId: string;
  loginId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  department: string | null;
  designation: string | null;
}

/**
 * Get the currently authenticated employee from a request.
 * Uses Clerk to get the userId, then looks up the Employee record.
 * 
 * @returns The authenticated employee record
 * @throws Response with 401 if not authenticated, 404 if employee not found
 */
export async function getCurrentEmployee(): Promise<AuthenticatedEmployee> {
  const { userId } = await auth();

  if (!userId) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized. Please sign in." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const employee = await prisma.employee.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
      clerkUserId: true,
      loginId: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      department: true,
      designation: true,
    },
  });

  if (!employee) {
    throw new Response(
      JSON.stringify({ error: "Employee profile not found. Contact your administrator." }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  return employee;
}

/**
 * Require the current user to have one of the specified roles.
 * 
 * @param allowedRoles - Array of roles that are permitted
 * @returns The authenticated employee
 * @throws Response with 403 if the user's role is not in the allowed list
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
 * Prevents employees from accessing other employees' data.
 * 
 * @param targetEmployeeId - The employee ID being accessed
 * @returns The authenticated employee
 * @throws Response with 403 if an employee tries to access another's data
 */
export async function requireSameEmployeeOrAdmin(
  targetEmployeeId: string
): Promise<AuthenticatedEmployee> {
  const employee = await getCurrentEmployee();

  const isAdmin = employee.role === "ADMIN" || employee.role === "HR";
  const isSameEmployee = employee.id === targetEmployeeId;

  if (!isAdmin && !isSameEmployee) {
    throw new Response(
      JSON.stringify({
        error: "Forbidden. You can only access your own records.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return employee;
}

/**
 * Check if an employee has admin/HR privileges.
 */
export function isAdminOrHR(role: Role): boolean {
  return role === "ADMIN" || role === "HR";
}
