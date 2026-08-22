import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onboardEmployeeSchema } from "@/lib/validations/auth";
import { generateLoginIdSync } from "@/lib/login-id";
import { computeSalaryBreakdown, DEFAULT_SALARY_CONFIG } from "@/lib/salary";

// GET /api/employees — Admin/HR lists all employees with filtering
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: employees });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Forbidden or unauthorized" },
      { status: 403 }
    );
  }
}

// POST /api/employees — Admin/HR onboards new employee with initial credentials
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

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
      loginId: customLoginId,
      initialPassword: customPassword,
      role,
      department,
      designation,
      phone,
      address,
      joinDate = new Date(),
      wage,
    } = parsed.data;

    // 1. Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: "An employee with this email already exists." },
        { status: 409 }
      );
    }

    // 2. Generate or validate Login ID
    const count = await prisma.employee.count();
    const loginId =
      customLoginId?.trim() ||
      generateLoginIdSync(firstName, lastName, joinDate, count + 1);

    const existingLoginId = await prisma.user.findUnique({
      where: { loginId },
    });
    if (existingLoginId) {
      return NextResponse.json(
        {
          success: false,
          error: `Login ID "${loginId}" is already taken. Please choose another username.`,
        },
        { status: 409 }
      );
    }

    // 3. Set initial temporary password
    // If HR provided a password, use it. Otherwise generate standard initial password (e.g. Dayflow2026!)
    const year = joinDate.getFullYear();
    const initialPassword =
      customPassword?.trim() || `Dayflow${year}!`;
    const passwordHash = hashPassword(initialPassword);

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
        dateOfJoining: joinDate,
        role,
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
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Admin or HR privileges required." },
        { status: 403 }
      );
    }
    console.error("Employee onboarding error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during onboarding" },
      { status: 500 }
    );
  }
}