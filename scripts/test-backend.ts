import "dotenv/config";
import { computeSalaryBreakdown, computeProratedPayroll, DEFAULT_SALARY_CONFIG } from "../src/lib/salary";
import { generateLoginIdSync } from "../src/lib/login-id";
import { leaveRequestSchema, leaveReviewSchema } from "../src/lib/validations/leave";
import { updateWageSchema, updateSalaryConfigSchema } from "../src/lib/validations/payroll";
import { loginSchema, changePasswordSchema, onboardEmployeeSchema } from "../src/lib/validations/auth";
import { hashPassword, comparePassword, generateToken, verifyToken } from "../src/lib/auth";
import { sendEmailAlert } from "../src/lib/email";
import { createNotification, notifyAdmins } from "../src/lib/notifications";
import { prisma } from "../src/lib/prisma";

async function runTests() {
  console.log("==================================================");
  console.log("🚀 STARTING DAYFLOW HRMS BACKEND TEST SUITE");
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
  console.log("📋 [1/8] Testing Salary Computation Engine...");
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
    
    const sumComponents = salary.basicSalary + salary.hra + salary.standardAllowance + salary.performanceBonus + salary.lta + salary.fixedAllowance;
    assert(Math.abs(sumComponents - wage) < 0.01, "Sum of all components exactly equals Wage", `Diff: ${Math.abs(sumComponents - wage)}`);
    assert(salary.fixedAllowance >= 0, "Fixed allowance is non-negative balancing figure", `Got ${salary.fixedAllowance}`);

    const proratedFull = computeProratedPayroll(salary, 22, 22);
    assert(proratedFull === salary.netPayable, "Prorated salary for full attendance equals Net Payable", `Expected ${salary.netPayable}, got ${proratedFull}`);

    const proratedHalf = computeProratedPayroll(salary, 11, 22);
    assert(proratedHalf < salary.netPayable, "Prorated salary for 50% attendance is appropriately reduced", `Expected < ${salary.netPayable}, got ${proratedHalf}`);

    let threw = false;
    try {
      computeSalaryBreakdown(4000, DEFAULT_SALARY_CONFIG);
    } catch {
      threw = true;
    }
    assert(threw, "Throws error when Wage is too low to satisfy fixed component minimums");
  } catch (err: any) {
    assert(false, "Salary engine suite exception", err?.message);
  }

  // -------------------------------------------------------------
  // TEST GROUP 2: Login ID Generator
  // -------------------------------------------------------------
  console.log("\n📋 [2/8] Testing Login ID Auto-Generation Format...");
  try {
    const id1 = generateLoginIdSync("John", "Doe", new Date("2023-05-10"), 1);
    assert(id1 === "OIJODO20230001", "Generates OI + First2 + Last2 + Year + 4-digit serial (OIJODO20230001)", `Got ${id1}`);

    const id2 = generateLoginIdSync("Rajesh", "Kumar", new Date("2021-01-01"), 42);
    assert(id2 === "OIRAKU20210042", "Generates OIRAKU20210042 correctly", `Got ${id2}`);
  } catch (err: any) {
    assert(false, "Login ID generator suite exception", err?.message);
  }

  // -------------------------------------------------------------
  // TEST GROUP 3: Zod Validation Schemas
  // -------------------------------------------------------------
  console.log("\n📋 [3/8] Testing Zod Validation Schemas...");
  try {
    const validLeave = leaveRequestSchema.safeParse({
      leaveType: "PAID",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-03"),
      reason: "Family vacation trip",
    });
    assert(validLeave.success, "Valid leave request passes schema validation");

    const invalidLeave = leaveRequestSchema.safeParse({
      leaveType: "PAID",
      startDate: new Date("2026-03-05"),
      endDate: new Date("2026-03-01"),
      reason: "Vacation",
    });
    assert(!invalidLeave.success, "Invalid leave (endDate < startDate) is rejected by schema");

    const validLogin = loginSchema.safeParse({ loginId: "OIRAKU20210001", password: "Dayflow2026!" });
    assert(validLogin.success, "Valid login input passes loginSchema");

    const invalidLogin = loginSchema.safeParse({ loginId: "", password: "" });
    assert(!invalidLogin.success, "Empty credentials rejected by loginSchema");

    const validChangePass = changePasswordSchema.safeParse({
      currentPassword: "Dayflow2026!",
      newPassword: "SecureNewPassword123",
      confirmPassword: "SecureNewPassword123",
    });
    assert(validChangePass.success, "Valid change password payload passes schema");

    const samePassChange = changePasswordSchema.safeParse({
      currentPassword: "Dayflow2026!",
      newPassword: "Dayflow2026!",
      confirmPassword: "Dayflow2026!",
    });
    assert(!samePassChange.success, "Identical current and new password rejected by changePasswordSchema");

    const validOnboard = onboardEmployeeSchema.safeParse({
      firstName: "Neha",
      lastName: "Kapoor",
      email: "neha.kapoor@example.com",
      loginId: "OINEKA20260011",
      initialPassword: "InitialPass2026!",
      wage: 65000,
    });
    assert(validOnboard.success, "Valid employee onboarding input passes onboardEmployeeSchema");
  } catch (err: any) {
    assert(false, "Zod validation suite exception", err?.message);
  }

  // -------------------------------------------------------------
  // TEST GROUP 4: Password Hashing & JWT Tokens
  // -------------------------------------------------------------
  console.log("\n📋 [4/8] Testing Password Hashing & JWT Tokens...");
  try {
    const rawPass = "DayflowSecret2026!";
    const hash = hashPassword(rawPass);
    assert(hash !== rawPass, "Password is encrypted (hashed)");
    assert(comparePassword(rawPass, hash), "comparePassword returns true for matching password");
    assert(!comparePassword("WrongPassword123", hash), "comparePassword returns false for incorrect password");

    const token = generateToken({
      userId: "user_test_123",
      loginId: "OITEST20260001",
      email: "test@dayflow.com",
      role: "EMPLOYEE",
      mustChangePassword: true,
    });
    assert(typeof token === "string" && token.length > 20, "generateToken creates valid JWT string");

    const verified = verifyToken(token);
    assert(verified?.userId === "user_test_123", "verifyToken extracts correct userId from token");
    assert(verified?.mustChangePassword === true, "verifyToken preserves mustChangePassword status");
  } catch (err: any) {
    assert(false, "Password & JWT suite exception", err?.message);
  }

  // -------------------------------------------------------------
  // TEST GROUP 5: Live Database Records & Queries
  // -------------------------------------------------------------
  console.log("\n📋 [5/8] Testing Live Database Records & Queries...");
  try {
    const employeesCount = await withRetry(() => prisma.employee.count());
    assert(employeesCount >= 10, `Database contains at least 10 seeded employees (found ${employeesCount})`);

    const users = await withRetry(() => prisma.user.findMany({ select: { id: true, email: true, loginId: true, passwordHash: true, mustChangePassword: true } }));
    assert(users.length >= 10, "All users exist in database");
    assert(users.every(u => u.passwordHash && u.passwordHash.length > 20), "All users have bcrypt password hashes");
    
    const adminUser = users.find(u => u.email === "rajesh.kumar@dayflow.com");
    assert(adminUser?.mustChangePassword === false, "Admin user (Rajesh) has mustChangePassword = false");

    const employeeUser = users.find(u => u.email === "priya.sharma@dayflow.com");
    assert(employeeUser?.mustChangePassword === true, "Newly onboarded user (Priya) has mustChangePassword = true");

    const attendancesCount = await withRetry(() => prisma.attendance.count());
    assert(attendancesCount >= 200, `Database contains ~230 attendance records (found ${attendancesCount})`);

    const leavesCount = await withRetry(() => prisma.leaveRequest.count());
    assert(leavesCount >= 9, `Database contains 9 leave requests (found ${leavesCount})`);

    const pendingLeaves = await withRetry(() => prisma.leaveRequest.count({ where: { status: "PENDING" } }));
    assert(pendingLeaves === 3, `Database contains 3 pending leaves for admin approval demo queue (found ${pendingLeaves})`);

    const payrollsCount = await withRetry(() => prisma.payroll.count());
    assert(payrollsCount >= 10, `All employees have active payroll records (found ${payrollsCount})`);

    const notifsCount = await withRetry(() => prisma.notification.count());
    assert(notifsCount >= 6, `Database contains seeded notifications (found ${notifsCount})`);
  } catch (err: any) {
    assert(false, "Live DB records suite exception", err?.message);
  }

  // -------------------------------------------------------------
  // TEST GROUP 6: Admin Onboarding & First-Login Password Change Simulation
  // -------------------------------------------------------------
  console.log("\n📋 [6/8] Testing Admin Onboarding & First-Login Simulation...");
  try {
    const testEmail = `test.onboard.${Date.now()}@dayflow.com`;
    const initialTempPassword = "InitialTempPass2026!";
    const testLoginId = `OIONBD${new Date().getFullYear()}9999`;
    
    const initialHash = hashPassword(initialTempPassword);
    const onboardedUser = await prisma.user.create({
      data: {
        email: testEmail,
        loginId: testLoginId,
        passwordHash: initialHash,
        role: "EMPLOYEE",
        mustChangePassword: true,
        isFirstLogin: true,
        employee: {
          create: {
            loginId: testLoginId,
            employeeId: "EMP999",
            firstName: "Onboarding",
            lastName: "TestEmployee",
            email: testEmail,
          },
        },
      },
      include: { employee: true },
    });

    assert(onboardedUser.mustChangePassword === true, "New onboarded employee is created with mustChangePassword: true");
    assert(comparePassword(initialTempPassword, onboardedUser.passwordHash!), "Employee can authenticate with initial password");

    const firstLoginToken = generateToken({
      userId: onboardedUser.id,
      loginId: onboardedUser.loginId!,
      email: onboardedUser.email,
      role: onboardedUser.role,
      employeeId: onboardedUser.employee?.id,
      mustChangePassword: onboardedUser.mustChangePassword,
    });
    const firstLoginPayload = verifyToken(firstLoginToken);
    assert(firstLoginPayload?.mustChangePassword === true, "First-login token carries mustChangePassword: true flag");

    const newPersonalPassword = "MyBrandNewSecurePass2026!";
    const newHash = hashPassword(newPersonalPassword);
    const updatedUser = await prisma.user.update({
      where: { id: onboardedUser.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        isFirstLogin: false,
      },
    });

    assert(updatedUser.mustChangePassword === false, "After password change, mustChangePassword is updated to false");
    assert(comparePassword(newPersonalPassword, updatedUser.passwordHash!), "New personal password matches updated hash");

    await prisma.user.delete({ where: { id: onboardedUser.id } });
    assert(true, "Temporary onboarding test user cleaned up successfully");
  } catch (err: any) {
    assert(false, "Onboarding simulation suite exception", err?.message);
  }

  // -------------------------------------------------------------
  // TEST GROUP 7: Notifications & Email Alert Dispatch
  // -------------------------------------------------------------
  console.log("\n📋 [7/8] Testing Notifications & Email Alerts...");
  try {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    assert(Boolean(admin), "Admin user found for notification testing");

    if (admin) {
      // 1. Create a notification
      const notif = await createNotification({
        userId: admin.id,
        title: "Test System Alert",
        message: "Automated test notification content",
        type: "SYSTEM",
        sendEmail: false,
      });
      assert(notif.isRead === false, "Notification created with isRead = false");

      // 2. Mark as read
      const updatedNotif = await prisma.notification.update({
        where: { id: notif.id },
        data: { isRead: true },
      });
      assert(updatedNotif.isRead === true, "Notification updated to isRead = true");

      // 3. Check unread count calculation
      const unreadCount = await prisma.notification.count({
        where: { userId: admin.id, isRead: false },
      });
      assert(typeof unreadCount === "number" && unreadCount >= 0, `Unread count correctly returned (${unreadCount})`);

      // 4. Delete notification
      await prisma.notification.delete({ where: { id: notif.id } });
      assert(true, "Notification deleted successfully");

      // 5. Test notifyAdmins dispatcher
      const adminNotifs = await notifyAdmins({
        title: "Leave Submission Alert",
        message: "A test employee has submitted a leave request.",
        type: "LEAVE_SUBMITTED",
      });
      assert(adminNotifs.length > 0, `notifyAdmins created notifications for ${adminNotifs.length} admin(s)`);

      // Cleanup created admin notifications
      await prisma.notification.deleteMany({
        where: { id: { in: adminNotifs.map(n => n.id) } },
      });

      // 6. Test Email Alert Dispatcher with env variable toggle
      process.env.ENABLE_EMAIL_ALERTS = "false";
      const disabledResult = await sendEmailAlert({
        to: "test@dayflow.com",
        subject: "Test Subject",
        text: "Test body",
      });
      assert(!disabledResult.enabled && !disabledResult.sent, "Email alert is disabled when ENABLE_EMAIL_ALERTS=false");

      process.env.ENABLE_EMAIL_ALERTS = "true";
      const enabledResult = await sendEmailAlert({
        to: "test@dayflow.com",
        subject: "Test Subject",
        text: "Test body",
      });
      assert(enabledResult.enabled && enabledResult.sent, "Email alert is dispatched when ENABLE_EMAIL_ALERTS=true");
    }
  } catch (err: any) {
    assert(false, "Notifications suite exception", err?.message);
  }

  // -------------------------------------------------------------
  // TEST GROUP 8: Analytics Overview & Summary Calculation Accuracy
  // -------------------------------------------------------------
  console.log("\n📋 [8/8] Testing Analytics Overview & Summary Aggregates...");
  try {
    const totalEmployees = await prisma.employee.count();
    const activeEmployees = await prisma.employee.count({ where: { status: "ACTIVE" } });
    assert(totalEmployees === activeEmployees, `All ${totalEmployees} seeded employees are ACTIVE`);

    const payrolls = await prisma.payroll.findMany({ select: { wage: true, netPayable: true } });
    const totalWage = payrolls.reduce((sum, p) => sum + p.wage, 0);
    const totalNet = payrolls.reduce((sum, p) => sum + p.netPayable, 0);
    assert(totalWage > totalNet, `Total Monthly CTC (₹${totalWage}) > Total Net Payable (₹${totalNet}) due to PF/Tax deductions`);

    const departments = await prisma.employee.groupBy({
      by: ["department"],
      _count: { id: true },
    });
    assert(departments.length >= 2, `Department breakdown correctly aggregates ${departments.length} distinct departments`);

    const leaves = await prisma.leaveRequest.groupBy({
      by: ["leaveType"],
      _count: { id: true },
    });
    assert(leaves.length >= 2, `Leave distribution aggregates ${leaves.length} leave types`);
  } catch (err: any) {
    assert(false, "Analytics suite exception", err?.message);
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
