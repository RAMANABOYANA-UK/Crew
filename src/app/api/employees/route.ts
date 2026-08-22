import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onboardEmployeeSchema } from "@/lib/validations/auth";
import { generateLoginId } from "@/lib/login-id";
import { hashPassword } from "@/lib/auth";
import { computeSalaryBreakdown, DEFAULT_SALARY_CONFIG } from "@/lib/salary";

// GET /api/employees — Admin/HR views all employees with filtering
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department");

    const employees = await prisma.employee.findMany({
      where: {
        AND: [
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
          },
        },
        payroll: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: employees });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 }
    );
  }
}

// POST /api/employees — Admin/HR onboards new employee with initial credentials
export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireAdmin();

    const body = await req.json();
    const parsed = onboardEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      department,
      designation,
      role,
      wage,
      loginId: customLoginId,
      initialPassword: customPassword,
    } = parsed.data;

    // 1. Check if email already exists in User
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: `An account with email ${email} already exists.`,
        },
        { status: 409 }
      );
    }

    // 2. Generate or validate unique Login ID (e.g. OIRAKU20260001)
    let loginId: string;
    const joinDate = new Date();
    const year = joinDate.getFullYear();

    if (customLoginId?.trim()) {
      loginId = customLoginId.trim().toUpperCase();
      const existingLoginId = await prisma.user.findUnique({
        where: { loginId },
      });
      if (existingLoginId) {
        return NextResponse.json(
          {
            success: false,
            error: `Login ID ${loginId} is already in use. Please choose another.`,
          },
          { status: 409 }
        );
      }
    } else {
      loginId = await generateLoginId(firstName, lastName, joinDate);
    }

    // 3. Set Initial Password (custom or standard initial format DayflowYYYY!)
    const initialPassword =
      customPassword?.trim() || `Dayflow${year}!`;
    const passwordHash = hashPassword(initialPassword);

    const count = await prisma.employee.count();
    const employeeId = `EMP${(count + 1).toString().padStart(3, "0")}`;

    // 4. Create User and linked Employee profile
    const user = await prisma.user.create({
      data: {
        loginId,
        email,
        passwordHash,
        role,
        mustChangePassword: true, // Requires password change on first login
        isFirstLogin: true,
      },
    });

    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        loginId,
        employeeId,
        firstName,
        lastName,
        email,
        phone: phone || null,
        address: address || null,
        department: department || null,
        designation: designation || null,
        joinDate,
      },
    });

    // 5. Initialize Payroll record
    const salaryBreakdown = computeSalaryBreakdown(wage, DEFAULT_SALARY_CONFIG);
    const payroll = await prisma.payroll.create({
      data: {
        employeeId: employee.id,
        wage: salaryBreakdown.wage,
        basicSalary: salaryBreakdown.basicSalary,
        hra: salaryBreakdown.hra,
        standardAllowance: salaryBreakdown.standardAllowance,
        performanceBonus: salaryBreakdown.performanceBonus,
        lta: salaryBreakdown.lta,
        fixedAllowance: salaryBreakdown.fixedAllowance,
        pfEmployee: salaryBreakdown.pfEmployee,
        pfEmployer: salaryBreakdown.pfEmployer,
        professionalTax: salaryBreakdown.professionalTax,
        netPayable: salaryBreakdown.netPayable,
        payableDays: 22,
        totalWorkingDays: 22,
      },
    });

    // Record immutable audit entry
    try {
      const { logAuditEvent } = await import("@/lib/audit");
      await logAuditEvent({
        actorId: adminUser.id,
        actorEmail: adminUser.email,
        action: "EMPLOYEE_CREATED",
        entityType: "Employee",
        entityId: employee.id,
        newValues: {
          employeeId: employee.employeeId,
          loginId,
          email,
          role,
          department,
          designation,
          wage,
        },
      });
    } catch (auditErr) {
      console.error("Failed to write audit log for employee onboarding:", auditErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Employee onboarded successfully.",
        data: {
          employee: {
            ...employee,
            user: {
              id: user.id,
              loginId: user.loginId,
              email: user.email,
              role: user.role,
              mustChangePassword: user.mustChangePassword,
            },
            payroll,
          },
          // Return initial credentials for HR to provide to employee
          credentials: {
            loginId,
            initialPassword,
            mustChangePassword: true,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Employee onboarding error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during onboarding" },
      { status: 500 }
    );
  }
}