/**
 * Seed Data Script for Dayflow HRMS
 * 
 * Creates:
 * - 1 SalaryConfig record with default rates
 * - 10 Employees (2 Admin/HR + 8 Employees)
 * - ~30 days of attendance records per employee
 * - 9 leave requests (mix of Pending/Approved/Rejected)
 * - Payroll records for all employees with correct salary breakdowns
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateLoginIdSync } from "../src/lib/login-id";
import { computeSalaryBreakdown, DEFAULT_SALARY_CONFIG } from "../src/lib/salary";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// ─── Employee Data ──────────────────────────────────────

const employees = [
  {
    firstName: "Rajesh",
    lastName: "Kumar",
    email: "rajesh.kumar@dayflow.com",
    role: "ADMIN" as const,
    department: "Management",
    designation: "HR Director",
    dateOfJoining: new Date("2021-03-15"),
    phone: "+91-9876543210",
    wage: 120000,
  },
  {
    firstName: "Priya",
    lastName: "Sharma",
    email: "priya.sharma@dayflow.com",
    role: "HR" as const,
    department: "Human Resources",
    designation: "HR Manager",
    dateOfJoining: new Date("2021-06-01"),
    phone: "+91-9876543211",
    wage: 95000,
  },
  {
    firstName: "Amit",
    lastName: "Patel",
    email: "amit.patel@dayflow.com",
    role: "EMPLOYEE" as const,
    department: "Engineering",
    designation: "Senior Developer",
    dateOfJoining: new Date("2022-01-10"),
    phone: "+91-9876543212",
    wage: 85000,
  },
  {
    firstName: "Sneha",
    lastName: "Reddy",
    email: "sneha.reddy@dayflow.com",
    role: "EMPLOYEE" as const,
    department: "Engineering",
    designation: "Frontend Developer",
    dateOfJoining: new Date("2022-07-20"),
    phone: "+91-9876543213",
    wage: 72000,
  },
  {
    firstName: "Vikram",
    lastName: "Singh",
    email: "vikram.singh@dayflow.com",
    role: "EMPLOYEE" as const,
    department: "Design",
    designation: "UI/UX Designer",
    dateOfJoining: new Date("2023-02-14"),
    phone: "+91-9876543214",
    wage: 68000,
  },
  {
    firstName: "Ananya",
    lastName: "Gupta",
    email: "ananya.gupta@dayflow.com",
    role: "EMPLOYEE" as const,
    department: "Marketing",
    designation: "Marketing Executive",
    dateOfJoining: new Date("2023-05-08"),
    phone: "+91-9876543215",
    wage: 55000,
  },
  {
    firstName: "Rohan",
    lastName: "Joshi",
    email: "rohan.joshi@dayflow.com",
    role: "EMPLOYEE" as const,
    department: "Engineering",
    designation: "Backend Developer",
    dateOfJoining: new Date("2023-09-01"),
    phone: "+91-9876543216",
    wage: 78000,
  },
  {
    firstName: "Meera",
    lastName: "Nair",
    email: "meera.nair@dayflow.com",
    role: "EMPLOYEE" as const,
    department: "Finance",
    designation: "Accountant",
    dateOfJoining: new Date("2024-01-15"),
    phone: "+91-9876543217",
    wage: 60000,
  },
  {
    firstName: "Karthik",
    lastName: "Menon",
    email: "karthik.menon@dayflow.com",
    role: "EMPLOYEE" as const,
    department: "Engineering",
    designation: "DevOps Engineer",
    dateOfJoining: new Date("2024-04-01"),
    phone: "+91-9876543218",
    wage: 82000,
  },
  {
    firstName: "Divya",
    lastName: "Bhat",
    email: "divya.bhat@dayflow.com",
    role: "EMPLOYEE" as const,
    department: "Sales",
    designation: "Sales Associate",
    dateOfJoining: new Date("2024-08-10"),
    phone: "+91-9876543219",
    wage: 48000,
  },
];

// ─── Helper Functions ───────────────────────────────────

function getWorkingDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Skip weekends
      days.push(date);
    }
  }
  return days;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Main Seed Function ─────────────────────────────────

async function main() {
  console.log("🌱 Starting seed...\n");

  // Clean existing data
  await prisma.attendance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.salaryConfig.deleteMany();

  console.log("🗑️  Cleaned existing data.\n");

  // 1. Create SalaryConfig
  const salaryConfig = await prisma.salaryConfig.create({
    data: {
      pfEmployeeRate: 0.12,
      pfEmployerRate: 0.12,
      professionalTax: 200,
      standardAllowance: 4167,
      performanceBonusRate: 0.0833,
      ltaRate: 0.0833,
    },
  });
  console.log("⚙️  Created SalaryConfig.\n");

  // 2. Create Employees
  const createdEmployees = [];
  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const loginId = generateLoginIdSync(
      emp.firstName,
      emp.lastName,
      emp.dateOfJoining,
      i + 1
    );
    const employeeId = `EMP${(i + 1).toString().padStart(3, "0")}`;

    const created = await prisma.employee.create({
      data: {
        clerkUserId: `clerk_seed_${employeeId.toLowerCase()}`,
        loginId,
        employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone,
        role: emp.role,
        department: emp.department,
        designation: emp.designation,
        dateOfJoining: emp.dateOfJoining,
        status: "ACTIVE",
      },
    });

    createdEmployees.push({ ...created, wage: emp.wage });
    console.log(
      `👤 Created ${emp.role.padEnd(8)} ${emp.firstName} ${emp.lastName} (${loginId}, ${employeeId})`
    );
  }
  console.log("");

  // 3. Create Attendance Records (last 30 days)
  console.log("📅 Creating attendance records...\n");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const attendanceData: Array<{
    employeeId: string;
    date: Date;
    checkIn: Date | null;
    checkOut: Date | null;
    status: "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE";
    hoursWorked: number | null;
  }> = [];

  for (const emp of createdEmployees) {
    let presentCount = 0;
    let absentCount = 0;

    for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d);
      currentDate.setHours(0, 0, 0, 0);
      const dayOfWeek = currentDate.getDay();

      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Determine status with weighted randomness
      // 70% present, 10% absent, 10% half-day, 10% on-leave
      const rand = Math.random();
      let status: "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE";
      let checkIn: Date | null = null;
      let checkOut: Date | null = null;
      let hoursWorked: number | null = null;

      if (rand < 0.70) {
        status = "PRESENT";
        checkIn = new Date(currentDate);
        checkIn.setHours(9, Math.floor(Math.random() * 30), 0, 0);
        checkOut = new Date(currentDate);
        checkOut.setHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
        hoursWorked = Math.round(((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)) * 100) / 100;
        presentCount++;
      } else if (rand < 0.80) {
        status = "ABSENT";
        absentCount++;
      } else if (rand < 0.90) {
        status = "HALF_DAY";
        checkIn = new Date(currentDate);
        checkIn.setHours(9, Math.floor(Math.random() * 30), 0, 0);
        checkOut = new Date(currentDate);
        checkOut.setHours(13, Math.floor(Math.random() * 30), 0, 0);
        hoursWorked = Math.round(((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)) * 100) / 100;
        presentCount += 0.5;
      } else {
        status = "ON_LEAVE";
      }

      // Make sure today has a good mix for the demo
      if (currentDate.getTime() === today.getTime()) {
        const empIndex = createdEmployees.indexOf(emp);
        if (empIndex < 5) {
          // First 5 employees are present today
          status = "PRESENT";
          checkIn = new Date(today);
          checkIn.setHours(9, 15, 0, 0);
          checkOut = null; // Still working
          hoursWorked = null;
        } else if (empIndex === 5) {
          // 6th employee on leave today
          status = "ON_LEAVE";
          checkIn = null;
          checkOut = null;
          hoursWorked = null;
        } else if (empIndex === 6) {
          // 7th employee absent
          status = "ABSENT";
          checkIn = null;
          checkOut = null;
          hoursWorked = null;
        } else {
          // Rest present
          status = "PRESENT";
          checkIn = new Date(today);
          checkIn.setHours(9, 30, 0, 0);
          checkOut = null;
          hoursWorked = null;
        }
      }

      attendanceData.push({
        employeeId: emp.id,
        date: new Date(currentDate),
        checkIn,
        checkOut,
        status,
        hoursWorked,
      });
    }
  }

  // Batch insert attendance
  await prisma.attendance.createMany({
    data: attendanceData,
  });
  console.log(`📅 Created ${attendanceData.length} attendance records.\n`);

  // 4. Create Leave Requests
  console.log("🏖️  Creating leave requests...\n");

  const leaveData = [
    // Pending leaves (for demo — admin can approve these)
    {
      employeeIndex: 2, // Amit
      leaveType: "PAID" as const,
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
      totalDays: 3,
      reason: "Family vacation planned for the upcoming weekend and Monday.",
      status: "PENDING" as const,
    },
    {
      employeeIndex: 3, // Sneha
      leaveType: "SICK" as const,
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
      totalDays: 2,
      reason: "Feeling unwell, need to visit the doctor and rest.",
      status: "PENDING" as const,
    },
    {
      employeeIndex: 6, // Rohan
      leaveType: "CASUAL" as const,
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
      totalDays: 1,
      reason: "Personal work — bank and government office visits.",
      status: "PENDING" as const,
    },
    // Approved leaves
    {
      employeeIndex: 5, // Ananya — on leave today
      leaveType: "PAID" as const,
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      totalDays: 1,
      reason: "Attending a family function.",
      status: "APPROVED" as const,
      adminComment: "Approved. Enjoy!",
    },
    {
      employeeIndex: 4, // Vikram
      leaveType: "PAID" as const,
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8),
      totalDays: 3,
      reason: "Travel to hometown for a wedding ceremony.",
      status: "APPROVED" as const,
      adminComment: "Approved. Please handover pending tasks.",
    },
    {
      employeeIndex: 7, // Meera
      leaveType: "SICK" as const,
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 14),
      totalDays: 2,
      reason: "Had fever and needed medical rest.",
      status: "APPROVED" as const,
      adminComment: "Get well soon. Approved.",
    },
    {
      employeeIndex: 8, // Karthik
      leaveType: "CASUAL" as const,
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5),
      totalDays: 1,
      reason: "Personal errands.",
      status: "APPROVED" as const,
      adminComment: "Approved.",
    },
    // Rejected leaves
    {
      employeeIndex: 9, // Divya
      leaveType: "UNPAID" as const,
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3),
      totalDays: 5,
      reason: "Want to take extended time off for personal project.",
      status: "REJECTED" as const,
      adminComment: "Too many days requested during project deadline. Please reapply for fewer days.",
    },
    {
      employeeIndex: 2, // Amit
      leaveType: "CASUAL" as const,
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 18),
      totalDays: 3,
      reason: "Wanted to attend a tech conference.",
      status: "REJECTED" as const,
      adminComment: "Conflict with sprint deadline. Please reschedule.",
    },
  ];

  for (const leave of leaveData) {
    const emp = createdEmployees[leave.employeeIndex];
    await prisma.leaveRequest.create({
      data: {
        employeeId: emp.id,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        totalDays: leave.totalDays,
        reason: leave.reason,
        status: leave.status,
        adminComment: "adminComment" in leave ? leave.adminComment : null,
        reviewedBy:
          leave.status !== "PENDING" ? createdEmployees[0].clerkUserId : null,
        reviewedAt:
          leave.status !== "PENDING" ? new Date() : null,
      },
    });
    console.log(
      `🏖️  ${leave.status.padEnd(8)} leave for ${emp.firstName} ${emp.lastName} (${leave.leaveType}, ${leave.totalDays} days)`
    );
  }
  console.log("");

  // 5. Create Payroll Records
  console.log("💰 Creating payroll records...\n");

  for (const emp of createdEmployees) {
    const breakdown = computeSalaryBreakdown(emp.wage, DEFAULT_SALARY_CONFIG);

    // Count payable days from attendance this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const workingDays = getWorkingDays(today.getFullYear(), today.getMonth());
    const totalWorkingDays = workingDays.length;

    const attendanceThisMonth = attendanceData.filter(
      (a) =>
        a.employeeId === emp.id &&
        a.date >= monthStart &&
        a.date <= today
    );

    let payableDays = 0;
    for (const att of attendanceThisMonth) {
      if (att.status === "PRESENT") payableDays += 1;
      else if (att.status === "HALF_DAY") payableDays += 0.5;
      else if (att.status === "ON_LEAVE") {
        // Check if this is paid leave
        payableDays += 1; // Count as payable for seed simplicity
      }
    }

    await prisma.payroll.create({
      data: {
        employeeId: emp.id,
        wage: breakdown.wage,
        basicSalary: breakdown.basicSalary,
        hra: breakdown.hra,
        standardAllowance: breakdown.standardAllowance,
        performanceBonus: breakdown.performanceBonus,
        lta: breakdown.lta,
        fixedAllowance: breakdown.fixedAllowance,
        pfEmployee: breakdown.pfEmployee,
        pfEmployer: breakdown.pfEmployer,
        professionalTax: breakdown.professionalTax,
        netPayable: breakdown.netPayable,
        payableDays: Math.round(payableDays),
        totalWorkingDays,
      },
    });
    console.log(
      `💰 Payroll for ${emp.firstName.padEnd(10)} — Wage: ₹${emp.wage.toLocaleString("en-IN").padStart(8)}, Net: ₹${breakdown.netPayable.toLocaleString("en-IN").padStart(8)}, Days: ${Math.round(payableDays)}/${totalWorkingDays}`
    );
  }

  console.log("\n✅ Seed completed successfully!");
  console.log(`   • ${createdEmployees.length} employees`);
  console.log(`   • ${attendanceData.length} attendance records`);
  console.log(`   • ${leaveData.length} leave requests`);
  console.log(`   • ${createdEmployees.length} payroll records`);
  console.log(`   • 1 salary config`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
