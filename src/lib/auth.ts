import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "./supabase";

export type Employee = {
  id: string;
  clerk_user_id: string;
  login_id: string;
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  address?: string | null;
  department?: string | null;
  designation?: string | null;
  role: "EMPLOYEE" | "ADMIN" | "HR";
  date_of_joining?: string | null;
  status: string;
  profile_picture?: string | null;
  basic_salary?: number;
  hra?: number;
  allowances?: number;
  created_at?: string;
  updated_at?: string;
};

export async function getCurrentEmployee(): Promise<Employee | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (error || !data) return null;
  return data as Employee;
}

export async function requireAuth(): Promise<Employee> {
  const employee = await getCurrentEmployee();
  if (!employee) {
    throw new Error("Unauthorized");
  }
  return employee;
}

export async function requireAdmin(): Promise<Employee> {
  const employee = await requireAuth();
  if (employee.role !== "ADMIN" && employee.role !== "HR") {
    throw new Error("Forbidden");
  }
  return employee;
}

export async function requireRole(roles: string[]): Promise<Employee> {
  const employee = await requireAuth();
  if (!roles.includes(employee.role)) {
    throw new Error("Forbidden");
  }
  return employee;
}

export async function syncEmployee() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  // Check if employee already exists
  const { data: existing } = await supabase
    .from("employees")
    .select("*")
    .eq("clerk_user_id", clerkUser.id)
    .single();

  if (existing) {
    return existing as Employee;
  }

  // Create new employee
  const firstName = clerkUser.firstName || "New";
  const lastName = clerkUser.lastName || "User";
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);

  const loginId = `OI${firstName.slice(0, 2).toUpperCase()}${lastName.slice(0, 2).toUpperCase()}${year}${random}`;
  const employeeId = `EMP${Date.now().toString().slice(-4)}`;

  const { data: newEmployee, error } = await supabase
    .from("employees")
    .insert({
      clerk_user_id: clerkUser.id,
      login_id: loginId,
      employee_id: employeeId,
      email,
      first_name: firstName,
      last_name: lastName,
      role: "EMPLOYEE",
      status: "ACTIVE",
      date_of_joining: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create employee:", error);
    return null;
  }

  return newEmployee as Employee;
}