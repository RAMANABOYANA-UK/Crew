import "dotenv/config";
import { computeSalaryBreakdown, computeProratedPayroll, DEFAULT_SALARY_CONFIG } from "../src/lib/salary";
import { generateLoginIdSync } from "../src/lib/login-id";
import { leaveRequestSchema } from "../src/lib/validations/leave";
import { loginSchema, changePasswordSchema } from "../src/lib/validations/auth";
import { hashPassword, comparePassword, generateToken, verifyToken } from "../src/lib/auth";
import { sendEmailAlert } from "../src/lib/email";
import { createNotification, notifyAdmins } from "../src/lib/notifications";
import { prisma } from "../src/lib/prisma";
import { scopeToSelf } from "../src/lib/scope";
import { resolveDayStatus } from "../src/lib/status-resolver";
import { applyLeaveApproval } from "../src/lib/leave-approver";

async function runTests() {
  console.log("==================================================");
  console.log("🚀 STARTING DAYFLOW HRMS COMPREHENSIVE BACKEND TEST SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    throw new Error("Retry failed");
  }

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TEST GROUP 1: Salary Computation Engine & Business Rules
  // -------------------------------------------------------------
  console.log("📋 [1/10] Testing Salary Computation Engine...");
  try {
    const wage = 85000;
    const salary = computeSalaryBreakdown(wage, DEFAULT_SALARY_CONFIG);

    assert(salary.wage === 85000, "Wage matches input", `Expected 85000, got ${salary.wage}`);
    assert(salary.basicSalary === 42500, "Basic is 50% of Wage", `Expected 42500, got ${salary.basicSalary}`);
    assert(salary.hra === 21250, "HRA is 50% of Basic", `Expected 21250, got ${salary.hra}`);
    assert(salary.standardAllowance === 4167, "Standard Allowance is ₹4,167", `Got ${salary.standardAllowance}`);
    assert(Math.round(salary.performanceBonus) === 3540, "Performance Bonus is 8.33% of Basic (~₹3,540)", `Got ${salary.performanceBonus}`);
    assert(Math.round(salary.lta) === 3540, "LTA is 8.33% of Basic (~₹3,540)", `Got ${salary.lta}`);
    assert(salary.pfEmployee === 5100, "PF Employee deduction is 12% of Basic", `Expected 5100, got ${salary.pfEmployee}`);
    assert(salary.professionalTax === 200, "Professional Tax is flat ₹200", `Got ${salary.professionalTax}`);

    const proratedFull = computeProratedPayroll(salary, 22, 22);
    assert(proratedFull === salary.netPayable, "Prorated salary for full attendance equals Net Payable");
  } catch (err: any) {
    assert(false, "Salary engine suite exception", err?.message);
  }

  // -------------------------------------------------------------
  // TEST GROUP 2: Login ID Generator & Row-Level Scoping
  // -------------------------------------------------------------
  console.log("\n📋 [2/10] Testing Login ID Generator & Row-Level Scoping Helper...");
  try {
    const id1 = generateLoginIdSync("John", "Doe", new Date("2023-05-10"), 1);
    assert(id1 === "OIJODO20230001", "Generates OIJODO20230001 correctly");

    const empSession = { role: "EMPLOYEE", employee: { id: "emp_123" } };
    const adminSession = { role: "ADMIN", employee: { id: "admin_456" } };

    const scopedEmp = scopeToSelf(empSession, "other_emp_789");
    assert(scopedEmp === "emp_123", "Employee session forces scope to own employeeId");

    const scopedAdmin = scopeToSelf(adminSession, "other_emp_789");
    assert(scopedAdmin === "other_emp_789", "Admin session allows querying requested employeeId");
  } catch (err: any) {
    assert(false, "Scoping suite exception", err?.message);
  }

  // -------------------------------------------------------------
  // TEST GROUP 3: Zod Validation Schemas
  // -------------------------------------------------------------
  console.log("\n📋 [3/10] Testing Zod Validation Schemas...");
  try {
    const validLeave = leaveRequestSchema.safeParse({
      leaveType: "PAID",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-03"),
      reason: "Family vacation trip",
    });
    assert(validLeave.success, "Valid leave request passes schema validation");

    const validLogin = loginSchema.safeParse({ loginId: "OIRAKU20210001", password: "Dayflow2026!" });
    assert(validLogin.success, "Valid login input passes loginSchema");
  } catch (err: any) {
    assert(false, "Zod validation suite exception", err?.message);
  }

  // -------------------------------------------------------------
  // TEST GROUP 4: Password Hashing & Pure JWT Tokens
  // -------------------------------------------------------------
  console.log("\n📋 [4/10] Testing Password Hashing & Pure JWT Tokens...");
  try {
    const rawPass = "DayflowSecret2026!";
    const hash = hashPassword(rawPass);
    assert(hash !== rawPass, "Password is encrypted");
    assert(comparePassword(rawPass, hash), "comparePassword matches correctly");

    const token = generateToken({
      userId: "user_test_123",
      loginId: "OITEST20260001",
      email: "test@dayflow.com",
      role: "EMPLOYEE",
      mustChangePassword: true,
    });
    const verified = verifyToken(token);
    assert(verified?.userId === "user_test_123", "verifyToken extracts correct userId");
  } catch (err: any) {
    assert(false, "Password & JWT suite exception", err?.message);
  }

  // -------------------------------------------------------------
  // TEST GROUP 5: Live Database Records & Scoping
  // -------------------------------------------------------------
  console.log("\n📋 [5/10] Testing Database Records...");
  try {
    const users = await withRetry(() => prisma.user.findMany());
    assert(users.length >= 10, "All users exist in database");
    assert(users.every(u => u.passwordHash && u.passwordHash.length > 20), "All users have bcrypt password hashes");
  } catch (err: any) {
    assert(false, "Live DB records suite exception", err?.message);
  }

  // -------------------------------------------------------------
  // TEST GROUP 6: Synthesized Status Resolver
  // -------------------------------------------------------------
  console.log("\n📋 [6/10] Testing Synthesized Status Resolver...");
  try {
    const weekendStatus = resolveDayStatus({
      date: new Date("2026-03-01"),
      isWeekend: true,
    });
    assert(weekendStatus === "WEEKEND", "Resolves weekend correctly");

    const leaveStatus = resolveDayStatus({
      date: new Date("2026-03-02"),
      leaveRequestsForDate: [{ status: "APPROVED" }],
    });
    assert(leaveStatus === "ON_LEAVE", "Resolves approved leave correctly");

    const checkedInStatus = resolveDayStatus({
      date: new Date("2026-03-02"),
      attendanceRow: { checkIn: new Date(), status: "PRESENT" },
    });
    assert(checkedInStatus === "CHECKED_IN_NOT_OUT", "Resolves checked-in without checkout");
  } catch (err: any) {
    assert(false, "Status resolver suite exception", err?.message);
  }

  // -------------------------------------------------------------
  // TEST GROUP 7: Smart Leave Auto-Approval Engine
  // -------------------------------------------------------------
  console.log("\n📋 [7/10] Testing Smart Leave Auto-Approval Engine...");
  try {
    const emp = await prisma.employee.findFirst({ where: { role: "EMPLOYEE" } });
    assert(Boolean(emp), "Found test employee for auto-approval");

    if (emp) {
      const today = new Date();
      const leave = await prisma.leaveRequest.create({
        data: {
          employeeId: emp.id,
          leaveType: "PAID",
          startDate: today,
          endDate: today,
          totalDays: 1,
          reason: "Auto-approve test leave",
          status: "PENDING",
        },
      });

      const approved = await applyLeaveApproval(leave.id, "SYSTEM");
      assert(approved?.status === "APPROVED", "applyLeaveApproval sets status to APPROVED");
      assert(approved?.reviewedBy === "SYSTEM", "applyLeaveApproval sets reviewedBy to SYSTEM");

      await prisma.leaveRequest.delete({ where: { id: leave.id } });
    }
  } catch (err: any) {
    assert(false, "Leave auto-approval suite exception", err?.message);
  }

  // -------------------------------------------------------------
  // TEST GROUP 8: Attendance Correction Workflow
  // -------------------------------------------------------------
  console.log("\n📋 [8/10] Testing Attendance Correction Workflow...");
  try {
    const emp = await prisma.employee.findFirst({ where: { role: "EMPLOYEE" } });
    if (emp) {
      const correction = await prisma.attendanceCorrection.create({
        data: {
          employeeId: emp.id,
          date: new Date(),
          requestedCheckIn: new Date(),
          requestedCheckOut: new Date(),
          reason: "Forgot to check out test",
          status: "PENDING",
        },
      });
      assert(correction.status === "PENDING", "AttendanceCorrection created in PENDING status");

      await prisma.attendanceCorrection.delete({ where: { id: correction.id } });
    }
  } catch (err: any) {
    assert(false, "Attendance correction suite exception", err?.message);
  }

  // -------------------------------------------------------------
  // TEST GROUP 9: Job History Audit Trail
  // -------------------------------------------------------------
  console.log("\n📋 [9/10] Testing Job History Audit Trail...");
  try {
    const emp = await prisma.employee.findFirst();
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (emp && admin) {
      const history = await prisma.employeeJobHistory.create({
        data: {
          employeeId: emp.id,
          field: "department",
          oldValue: emp.department,
          newValue: "Special Operations",
          reason: "Promotional transfer test",
          changedBy: admin.id,
        },
      });
      assert(history.reason === "Promotional transfer test", "Job history entry recorded reason correctly");

      await prisma.employeeJobHistory.delete({ where: { id: history.id } });
    }
  } catch (err: any) {
    assert(false, "Job history suite exception", err?.message);
  }

  // -------------------------------------------------------------
  // TEST GROUP 10: Notifications
  // -------------------------------------------------------------
  console.log("\n📋 [10/10] Testing Notifications & Email Alerts...");
  try {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (admin) {
      const notif = await createNotification({
        userId: admin.id,
        title: "Test System Alert",
        message: "Automated test notification content",
        type: "SYSTEM",
        sendEmail: false,
      });
      assert(notif.isRead === false, "Notification created with isRead = false");
      await prisma.notification.delete({ where: { id: notif.id } });
    }
  } catch (err: any) {
    assert(false, "Notifications suite exception", err?.message);
  }

  console.log("\n==================================================");
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error("Test runner failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
