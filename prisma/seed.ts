/**
 * Seed Data Script for Dayflow HRMS
 * 
 * Creates Employees (Clerk-linked via clerkUserId, with credential User accounts
 * for the first-login password workflow) plus P3 Attendance/Leave/Payroll data.
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { computeSalaryBreakdown, DEFAULT_SALARY_CONFIG } from "../src/lib/salary";

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Employee Data ──────────────────────────────────────

const employees = [
  { firstName: "Rajesh", lastName: "Kumar", email: "rajesh.kumar@dayflow.com", role: "ADMIN" as const, department: "Management", designation: "HR Director", joinDate: new Date("2021-03-15"), phone: "+91-9876543210", wage: 120000 },
  { firstName: "Priya", lastName: "Sharma", email: "priya.sharma@dayflow.com", role: "HR" as const, department: "Human Resources", designation: "HR Manager", joinDate: new Date("2021-06-01"), phone: "+91-9876543211", wage: 95000 },
  { firstName: "Amit", lastName: "Patel", email: "amit.patel@dayflow.com", role: "EMPLOYEE" as const, department: "Engineering", designation: "Senior Developer", joinDate: new Date("2022-01-10"), phone: "+91-9876543212", wage: 85000 },
  { firstName: "Sneha", lastName: "Reddy", email: "sneha.reddy@dayflow.com", role: "EMPLOYEE" as const, department: "Engineering", designation: "Frontend Developer", joinDate: new Date("2022-07-20"), phone: "+91-9876543213", wage: 72000 },
  { firstName: "Vikram", lastName: "Singh", email: "vikram.singh@dayflow.com", role: "EMPLOYEE" as const, department: "Design", designation: "UI/UX Designer", joinDate: new Date("2023-02-14"), phone: "+91-9876543214", wage: 68000 },
  { firstName: "Ananya", lastName: "Gupta", email: "ananya.gupta@dayflow.com", role: "EMPLOYEE" as const, department: "Marketing", designation: "Marketing Executive", joinDate: new Date("2023-05-08"), phone: "+91-9876543215", wage: 55000 },
  { firstName: "Rohan", lastName: "Joshi", email: "rohan.joshi@dayflow.com", role: "EMPLOYEE" as const, department: "Engineering", designation: "Backend Developer", joinDate: new Date("2023-09-01"), phone: "+91-9876543216", wage: 78000 },
  { firstName: "Meera", lastName: "Nair", email: "meera.nair@dayflow.com", role: "EMPLOYEE" as const, department: "Finance", designation: "Accountant", joinDate: new Date("2024-01-15"), phone: "+91-9876543217", wage: 60000 },
  { firstName: "Karthik", lastName: "Menon", email: "karthik.menon@dayflow.com", role: "EMPLOYEE" as const, department: "Engineering", designation: "DevOps Engineer", joinDate: new Date("2024-04-01"), phone: "+91-9876543218", wage: 82000 },
  { firstName: "Divya", lastName: "Bhat", email: "divya.bhat@dayflow.com", role: "EMPLOYEE" as const, department: "Sales", designation: "Sales Associate", joinDate: new Date("2024-08-10"), phone: "+91-9876543219", wage: 48000 },
];

function generateLoginId(firstName: string, lastName: string, joinDate: Date, serial: number): string {
  const prefix = "OI";
  const firstTwo = firstName.substring(0, 2).toUpperCase();
  const lastTwo = lastName.substring(0, 2).toUpperCase();
  const joinYear = joinDate.getFullYear().toString();
  return `${prefix}${firstTwo}${lastTwo}${joinYear}${serial.toString().padStart(4, "0")}`;
}

async function main() {
  console.log("🌱 Starting seed...\n");

  // Clean existing data (order matters for FK constraints)
  await prisma.attendance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();
  await prisma.salaryConfig.deleteMany();
  console.log("🗑️  Cleaned existing data.\n");

  // 1. Create SalaryConfig
  await prisma.salaryConfig.create({
    data: { pfEmployeeRate: 0.12, pfEmployerRate: 0.12, professionalTax: 200, standardAllowance: 4167, performanceBonusRate: 0.0833, ltaRate: 0.0833 },
  });
  console.log("⚙️  Created SalaryConfig.\n");

  // 2. Create Employees (with linked credential User accounts)
  const createdEmployees: Array<{ id: string; wage: number; firstName: string; lastName: string }> = [];

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const employeeId = `EMP${(i + 1).toString().padStart(3, "0")}`;
    const loginId = generateLoginId(emp.firstName, emp.lastName, emp.joinDate, i + 1);

    const passwordHash = bcrypt.hashSync("Dayflow2026!", 10);
    const mustChangePassword = i !== 0; // Rajesh Kumar has already changed password, others are in first-login state

    const user = await prisma.user.create({
      data: {
        clerkId: `clerk_seed_${employeeId.toLowerCase()}`,
        loginId,
        email: emp.email,
        passwordHash,
        role: emp.role,
        mustChangePassword,
        isFirstLogin: mustChangePassword,
      },
    });

    const employee = await prisma.employee.create({
      data: {
        clerkUserId: `clerk_seed_${employeeId.toLowerCase()}`,
        userId: user.id,
        loginId,
        employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone,
        department: emp.department,
        designation: emp.designation,
        dateOfJoining: emp.joinDate,
        role: emp.role,
      },
    });

    createdEmployees.push({ id: employee.id, userId: user.id, wage: emp.wage, firstName: emp.firstName, lastName: emp.lastName });
    console.log(`👤 Created ${emp.role.padEnd(8)} ${emp.firstName} ${emp.lastName} (${loginId}, ${employeeId})`);
  }
  console.log("");

  // 3. Create Attendance Records (last 30 days)
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const dates: Date[] = [];
  for (let i = 30; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const day = d.getUTCDay();
    if (i === 0 || (day !== 0 && day !== 6)) {
      dates.push(d);
    }
  }

  const attendanceData: Array<{ employeeId: string; date: Date; checkIn: Date | null; checkOut: Date | null; status: "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE"; hoursWorked: number | null }> = [];

  for (const emp of createdEmployees) {
    const empIndex = createdEmployees.indexOf(emp);
    for (const currentDate of dates) {
      let status: "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE";
      let checkIn: Date | null = null;
      let checkOut: Date | null = null;
      let hoursWorked: number | null = null;

      // Today: mix for demo
      if (currentDate.getTime() === today.getTime()) {
        if (empIndex < 5) { status = "PRESENT"; checkIn = new Date(today); checkIn.setUTCHours(9, 15); }
        else if (empIndex === 5) { status = "ON_LEAVE"; }
        else if (empIndex === 6) { status = "ABSENT"; }
        else { status = "PRESENT"; checkIn = new Date(today); checkIn.setUTCHours(9, 30); }
      } else {
        const rand = Math.random();
        if (rand < 0.70) {
          status = "PRESENT";
          checkIn = new Date(currentDate); checkIn.setUTCHours(9, Math.floor(Math.random() * 30));
          checkOut = new Date(currentDate); checkOut.setUTCHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
          hoursWorked = Math.round(((checkOut.getTime() - checkIn.getTime()) / 3600000) * 100) / 100;
        } else if (rand < 0.80) { status = "ABSENT"; }
        else if (rand < 0.90) {
          status = "HALF_DAY";
          checkIn = new Date(currentDate); checkIn.setUTCHours(9, Math.floor(Math.random() * 30));
          checkOut = new Date(currentDate); checkOut.setUTCHours(13, Math.floor(Math.random() * 30));
          hoursWorked = Math.round(((checkOut.getTime() - checkIn.getTime()) / 3600000) * 100) / 100;
        } else { status = "ON_LEAVE"; }
      }
      attendanceData.push({ employeeId: emp.id, date: new Date(currentDate), checkIn, checkOut, status, hoursWorked });
    }
  }
  await prisma.attendance.createMany({ data: attendanceData });
  console.log(`📅 Created ${attendanceData.length} attendance records.\n`);

  // 4. Create Leave Requests
  const leaveData = [
    { empIdx: 2, type: "PAID" as const, start: 3, end: 5, days: 3, reason: "Family vacation.", status: "PENDING" as const },
    { empIdx: 3, type: "SICK" as const, start: 1, end: 2, days: 2, reason: "Feeling unwell.", status: "PENDING" as const },
    { empIdx: 6, type: "CASUAL" as const, start: 2, end: 2, days: 1, reason: "Personal work.", status: "PENDING" as const },
    { empIdx: 5, type: "PAID" as const, start: 0, end: 0, days: 1, reason: "Family function.", status: "APPROVED" as const, comment: "Approved. Enjoy!" },
    { empIdx: 4, type: "PAID" as const, start: -10, end: -8, days: 3, reason: "Wedding ceremony.", status: "APPROVED" as const, comment: "Approved." },
    { empIdx: 7, type: "SICK" as const, start: -15, end: -14, days: 2, reason: "Fever.", status: "APPROVED" as const, comment: "Get well soon." },
    { empIdx: 8, type: "CASUAL" as const, start: -5, end: -5, days: 1, reason: "Personal errands.", status: "APPROVED" as const, comment: "Approved." },
    { empIdx: 9, type: "UNPAID" as const, start: -7, end: -3, days: 5, reason: "Extended time off.", status: "REJECTED" as const, comment: "Too many days during deadline." },
    { empIdx: 2, type: "CASUAL" as const, start: -20, end: -18, days: 3, reason: "Tech conference.", status: "REJECTED" as const, comment: "Conflict with sprint deadline." },
  ];

  for (const l of leaveData) {
    const emp = createdEmployees[l.empIdx];
    const startDate = new Date(today); startDate.setDate(startDate.getDate() + l.start); startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(today); endDate.setDate(endDate.getDate() + l.end); endDate.setHours(0, 0, 0, 0);
    await prisma.leaveRequest.create({
      data: {
        employeeId: emp.id, leaveType: l.type, startDate, endDate, totalDays: l.days,
        reason: l.reason, status: l.status,
        adminComment: "comment" in l ? l.comment : null,
        reviewedBy: l.status !== "PENDING" ? createdEmployees[0].id : null,
        reviewedAt: l.status !== "PENDING" ? new Date() : null,
      },
    });
    console.log(`🏖️  ${l.status.padEnd(8)} leave for ${emp.firstName} ${emp.lastName} (${l.type}, ${l.days} days)`);
  }
  console.log("");

  // 5. Create Payroll Records
  for (const emp of createdEmployees) {
    const breakdown = computeSalaryBreakdown(emp.wage, DEFAULT_SALARY_CONFIG);
    const monthAttendance = attendanceData.filter(a => a.employeeId === emp.id && a.date.getMonth() === today.getMonth());
    let payableDays = 0;
    for (const a of monthAttendance) {
      if (a.status === "PRESENT") payableDays++;
      else if (a.status === "HALF_DAY") payableDays += 0.5;
      else if (a.status === "ON_LEAVE") payableDays++;
    }

    await prisma.payroll.create({
      data: {
        employeeId: emp.id, wage: breakdown.wage, basicSalary: breakdown.basicSalary,
        hra: breakdown.hra, standardAllowance: breakdown.standardAllowance,
        performanceBonus: breakdown.performanceBonus, lta: breakdown.lta,
        fixedAllowance: breakdown.fixedAllowance, pfEmployee: breakdown.pfEmployee,
        pfEmployer: breakdown.pfEmployer, professionalTax: breakdown.professionalTax,
        netPayable: breakdown.netPayable, payableDays: Math.round(payableDays), totalWorkingDays: 22,
      },
    });
    console.log(`💰 Payroll for ${emp.firstName.padEnd(10)} — Wage: ₹${emp.wage.toLocaleString("en-IN").padStart(8)}, Net: ₹${breakdown.netPayable.toLocaleString("en-IN").padStart(8)}`);
  }

  // 6. Create Sample Notifications
  const adminUser = createdEmployees[0];
  const hrUser = createdEmployees[1];
  const emp1 = createdEmployees[2]; // Amit Patel
  const emp2 = createdEmployees[3]; // Sneha Reddy

  const sampleNotifications = [
    { userId: adminUser.userId, title: "New Leave Request Submitted", message: "Amit Patel has applied for 3 days of PAID leave.", type: "LEAVE_SUBMITTED" as const, isRead: false },
    { userId: adminUser.userId, title: "New Leave Request Submitted", message: "Sneha Reddy has applied for 2 days of SICK leave.", type: "LEAVE_SUBMITTED" as const, isRead: false },
    { userId: hrUser.userId, title: "New Leave Request Submitted", message: "Rohan Joshi has applied for 1 day of CASUAL leave.", type: "LEAVE_SUBMITTED" as const, isRead: true },
    { userId: emp1.userId, title: "Leave Request Approved", message: "Your CASUAL leave request for 3 days was rejected.", type: "LEAVE_REJECTED" as const, isRead: true },
    { userId: emp2.userId, title: "Leave Request Approved", message: "Your PAID leave request was approved by HR.", type: "LEAVE_APPROVED" as const, isRead: false },
    { userId: adminUser.userId, title: "Monthly Payroll Generated", message: "Payroll for all 10 employees processed for current cycle.", type: "SYSTEM" as const, isRead: true },
  ];

  for (const n of sampleNotifications) {
    await prisma.notification.create({ data: n });
  }
  console.log(`\n🔔 Seeded ${sampleNotifications.length} sample notifications.`);

  console.log("\n✅ Seed completed successfully!");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });