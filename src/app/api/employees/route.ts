import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scopeToSelf } from "@/lib/scope";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const createEmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  role: z.enum(["ADMIN", "HR", "EMPLOYEE"]).default("EMPLOYEE"),
  basicSalary: z.number().optional().default(0),
  hra: z.number().optional().default(0),
  allowances: z.number().optional().default(0),
  wage: z.number().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department");
    const requestedEmployeeId = searchParams.get("employeeId");

    const scopedEmployeeId = scopeToSelf(session, requestedEmployeeId);

    const employees = await prisma.employee.findMany({
      where: {
        AND: [
          scopedEmployeeId ? { id: scopedEmployeeId } : {},
          search
            ? {
                OR: [
                  { firstName: { contains: search, mode: "insensitive" } },
                  { lastName: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                  { employeeId: { contains: search, mode: "insensitive" } },
                  { loginId: { contains: search, mode: "insensitive" } },
                ],
              }
            : {},
          department ? { department } : {},
        ],
      },
      include: {
        user: {
          select: {
            email: true,
            role: true,
            loginId: true,
            mustChangePassword: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: employees });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/employees — Admin/HR provisions a new employee
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();

    const body = await req.json();
    const parsed = createEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          data: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "An employee account with this email already exists." },
        { status: 409 }
      );
    }

    // Generate Employee Sequence ID & Login ID
    const count = await prisma.employee.count();
    const seq = (count + 1).toString().padStart(3, "0");
    const employeeId = `EMP${seq}`;

    const year = new Date().getFullYear().toString();
    const firstTwo = data.firstName.slice(0, 2).toUpperCase();
    const lastTwo = data.lastName.slice(0, 2).toUpperCase();
    const loginId = `OI${firstTwo}${lastTwo}${year}${seq.padStart(4, "0")}`;

    // Generate temporary password
    const temporaryPassword = `Welcome@123`;
    const passwordHash = hashPassword(temporaryPassword);

    // Create User & Employee in a transaction with identical User.role and Employee.role
    const [user, employee] = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          loginId,
          email: data.email,
          passwordHash,
          role: data.role,
          mustChangePassword: true,
          isFirstLogin: true,
        },
      });

      const e = await tx.employee.create({
        data: {
          userId: u.id,
          loginId,
          employeeId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || null,
          department: data.department || null,
          designation: data.designation || null,
          dateOfJoining: new Date(),
          role: data.role,
          status: "ACTIVE",
          basicSalary: data.basicSalary,
          hra: data.hra,
          allowances: data.allowances,
        },
      });

      // Create initial JobHistory entry
      await tx.employeeJobHistory.create({
        data: {
          employeeId: e.id,
          field: "status",
          oldValue: null,
          newValue: "ACTIVE",
          reason: "Initial onboarding and account provisioning",
          changedBy: admin.id,
        },
      });

      return [u, e];
    });

    // Write AuditLog entry for EMPLOYEE_CREATED
    await logAuditEvent({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "EMPLOYEE_CREATED",
      entityType: "Employee",
      entityId: employee.id,
      newValues: {
        employeeId: employee.employeeId,
        loginId: employee.loginId,
        email: employee.email,
        role: user.role,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            loginId: user.loginId,
            email: user.email,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
          },
          employee,
          temporaryPassword,
        },
        message: "Employee account provisioned successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}