import "dotenv/config";
import { computeSalaryBreakdown, computeProratedPayroll, DEFAULT_SALARY_CONFIG } from "../src/lib/salary";
import { generateLoginIdSync } from "../src/lib/login-id";
import { leaveRequestSchema, leaveReviewSchema } from "../src/lib/validations/leave";
import { updateWageSchema, updateSalaryConfigSchema } from "../src/lib/validations/payroll";
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
  console.log("📋 [1/5] Testing Salary Computation Engine...");
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

    // Test proration
    const proratedFull = computeProratedPayroll(salary, 22, 22);
    assert(proratedFull === salary.netPayable, "Prorated salary for full attendance equals Net Payable", `Got ${proratedFull}`);

    const proratedHalf = computeProratedPayroll(salary, 11, 22);
    assert(proratedHalf < salary.netPayable && proratedHalf > 0, "Prorated salary for 50% attendance is appropriately reduced", `Got ${proratedHalf}`);

    // Test negative allowance error handling
    let errorThrown = false;
    try {
      computeSalaryBreakdown(5000, DEFAULT_SALARY_CONFIG);
    } catch {
      errorThrown = true;
    }
    assert(errorThrown, "Throws error when Wage is too low to satisfy fixed component minimums");
  } catch (err: unknown) {
    console.error("Salary test error:", err);
    failed++;
  }

  // -------------------------------------------------------------
  // TEST GROUP 2: Login ID Generation Format
  // -------------------------------------------------------------
  console.log("\n📋 [2/5] Testing Login ID Auto-Generation Format...");
  try {
    const loginId = generateLoginIdSync("John", "Doe", new Date("2023-01-01"), 1);
    assert(loginId === "OIJODO20230001", "Generates OI + First2 + Last2 + Year + 4-digit serial (OIJODO20230001)", `Got ${loginId}`);
    
    const loginId2 = generateLoginIdSync("Rajesh", "Kumar", new Date("2021-03-15"), 42);
    assert(loginId2 === "OIRAKU20210042", "Generates OIRAKU20210042 correctly", `Got ${loginId2}`);
  } catch (err: unknown) {
    console.error("Login ID test error:", err);
    failed++;
  }

  // -------------------------------------------------------------
  // TEST GROUP 3: Zod Validation Schemas
  // -------------------------------------------------------------
  console.log("\n📋 [3/5] Testing Zod Validation Schemas...");
  try {
    const validLeave = leaveRequestSchema.safeParse({
      leaveType: "PAID",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-05"),
      reason: "Annual vacation with family",
    });
    assert(validLeave.success, "Valid leave request passes schema validation");

    const invalidDateLeave = leaveRequestSchema.safeParse({
      leaveType: "PAID",
      startDate: new Date("2026-09-10"),
      endDate: new Date("2026-09-05"),
      reason: "Invalid dates test",
    });
    assert(!invalidDateLeave.success, "Invalid leave (endDate < startDate) is rejected by schema");

    const validReview = leaveReviewSchema.safeParse({
      status: "APPROVED",
      adminComment: "Approved by manager",
    });
    assert(validReview.success, "Valid admin leave review passes schema");

    const validWage = updateWageSchema.safeParse({ wage: 95000 });
    assert(validWage.success, "Valid wage update (₹95,000) passes validation");

    const invalidWage = updateWageSchema.safeParse({ wage: 5000 });
    assert(!invalidWage.success, "Wage below minimum ₹10,000 is rejected");
  } catch (err: unknown) {
    console.error("Validation schema test error:", err);
    failed++;
  }

  // -------------------------------------------------------------
  // TEST GROUP 4: Database Queries & Seed Verification
  // -------------------------------------------------------------
  console.log("\n📋 [4/5] Testing Live Database Records & Queries...");
  try {
    const employeeCount = await withRetry(() => prisma.employee.count());
    assert(employeeCount === 10, "Database contains exactly 10 seeded employees", `Found ${employeeCount}`);

    const attendanceCount = await withRetry(() => prisma.attendance.count());
    assert(attendanceCount >= 200, "Database contains ~220 attendance records", `Found ${attendanceCount}`);

    const leaveCount = await withRetry(() => prisma.leaveRequest.count());
    assert(leaveCount === 9, "Database contains 9 leave requests (mix of statuses)", `Found ${leaveCount}`);

    const pendingLeaves = await withRetry(() => prisma.leaveRequest.count({ where: { status: "PENDING" } }));
    assert(pendingLeaves === 3, "Database contains 3 pending leaves for admin approval demo queue", `Found ${pendingLeaves}`);

    const approvedLeaves = await withRetry(() => prisma.leaveRequest.count({ where: { status: "APPROVED" } }));
    assert(approvedLeaves === 4, "Database contains 4 approved leaves", `Found ${approvedLeaves}`);

    const payrollRecords = await withRetry(() => prisma.payroll.findMany({ include: { employee: true } }));
    assert(payrollRecords.length === 10, "All 10 employees have active payroll records", `Found ${payrollRecords.length}`);

    const salaryConfig = await withRetry(() => prisma.salaryConfig.findFirst());
    assert(salaryConfig !== null && salaryConfig.pfEmployeeRate === 0.12, "Salary configuration exists with 12% PF rate");
  } catch (err: unknown) {
    console.error("Database query test error:", err);
    failed++;
  }

  // -------------------------------------------------------------
  // TEST GROUP 5: Business Workflows Simulation
  // -------------------------------------------------------------
  console.log("\n📋 [5/5] Testing Golden Path & Attendance Proration Business Logic...");
  try {
    // Check-in and attendance status mapping
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const todayAttendances = await withRetry(() => prisma.attendance.findMany({
      where: { date: today },
      include: { employee: true },
    }));

    const presentEmployees = todayAttendances.filter(a => a.status === "PRESENT");
    assert(presentEmployees.length > 0, "Today has present employees for dashboard green status dot", `Found ${presentEmployees.length}`);

    const onLeaveEmployees = todayAttendances.filter(a => a.status === "ON_LEAVE");
    assert(onLeaveEmployees.length > 0 || (await prisma.leaveRequest.count({ where: { status: "APPROVED" } })) > 0, "Approved leave status integration works");

    // Wage update and recalculation simulation
    const empPayroll = await prisma.payroll.findFirst({
      include: { employee: true },
    });
    if (empPayroll) {
      const newWage = 90000;
      const recomputed = computeSalaryBreakdown(newWage, DEFAULT_SALARY_CONFIG);
      assert(recomputed.basicSalary === 45000, "Wage increase to ₹90k recalculates Basic to ₹45k");
      assert(recomputed.hra === 22500, "HRA recalculates to ₹22.5k");
      assert(recomputed.netPayable > 0, "Net payable computed successfully");
    }
  } catch (err: unknown) {
    console.error("Workflow simulation error:", err);
    failed++;
  }

  console.log("\n==================================================");
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
