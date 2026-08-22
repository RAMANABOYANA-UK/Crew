/**
 * Row-Level Scoping Helper for Dayflow HRMS
 *
 * Enforces server-side data isolation:
 * - EMPLOYEE role callers can ONLY ever access their own employeeId.
 * - ADMIN / HR role callers can pass any requestedEmployeeId, or undefined for all.
 */

export interface UserSession {
  role: string;
  employee?: {
    id: string;
  } | null;
}

export function scopeToSelf(
  session: UserSession,
  requestedEmployeeId?: string | null
): string | undefined {
  if (session.role === "EMPLOYEE") {
    // Force employee to only access their own employee ID
    return session.employee?.id || "unauthorized_no_employee_profile";
  }
  
  // Admin / HR can request specific employee ID or undefined (all)
  return requestedEmployeeId || undefined;
}
