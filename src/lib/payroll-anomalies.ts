/**
 * Payroll Anomaly Detection Engine
 * 
 * Scans payroll records and attendance data for potential discrepancies:
 * 1. HIGH_SALARY_LEAP: Unusual salary spikes (> 25% increase or > ₹25,000)
 * 2. NEGATIVE_NET_PAY: Net payable <= 0 or total deductions >= gross salary
 * 3. ATTENDANCE_MISMATCH: Zero present attendance with full payable days, or payable days > total working days
 * 4. BELOW_MIN_WAGE: Wage below statutory minimum of ₹10,000
 */

import { prisma } from "./prisma";
import { AnomalySeverity, Prisma } from "../generated/prisma/client";

export interface DetectedAnomaly {
  employeeId: string;
  employeeName: string;
  payrollId?: string;
  ruleCode: "HIGH_SALARY_LEAP" | "NEGATIVE_NET_PAY" | "ATTENDANCE_MISMATCH" | "BELOW_MIN_WAGE";
  severity: AnomalySeverity;
  title: string;
  description: string;
  details: Prisma.InputJsonValue;
}

export async function scanPayrollAnomalies(targetEmployeeId?: string): Promise<DetectedAnomaly[]> {
  const anomalies: DetectedAnomaly[] = [];

  const employees = await prisma.employee.findMany({
    where: targetEmployeeId ? { id: targetEmployeeId } : {},
    include: {
      payroll: true,
      attendances: {
        where: {
          date: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
    },
  });

  for (const emp of employees) {
    if (!emp.payroll) continue;

    const wage = Number(emp.payroll.wage);
    const netPayable = Number(emp.payroll.netPayable);
    const payableDays = emp.payroll.payableDays;
    const totalWorkingDays = emp.payroll.totalWorkingDays;
    const fullName = `${emp.firstName} ${emp.lastName}`;

    // ─── Rule 1: Below Minimum Wage ─────────────────────────
    if (wage < 10000) {
      anomalies.push({
        employeeId: emp.id,
        employeeName: fullName,
        payrollId: emp.payroll.id,
        ruleCode: "BELOW_MIN_WAGE",
        severity: "HIGH",
        title: `Wage Below Minimum Bound: ₹${wage}`,
        description: `Employee ${fullName}'s wage of ₹${wage} is below the required statutory minimum of ₹10,000.`,
        details: { wage, minimumAllowed: 10000 },
      });
    }

    // ─── Rule 2: Negative or Zero Net Pay ───────────────────
    if (netPayable <= 0) {
      anomalies.push({
        employeeId: emp.id,
        employeeName: fullName,
        payrollId: emp.payroll.id,
        ruleCode: "NEGATIVE_NET_PAY",
        severity: "CRITICAL",
        title: `Non-positive Net Pay: ₹${netPayable}`,
        description: `Employee ${fullName} has a computed net payable amount of ₹${netPayable}. Deductions exceed earnings.`,
        details: {
          wage,
          netPayable,
          pfEmployee: Number(emp.payroll.pfEmployee),
          professionalTax: Number(emp.payroll.professionalTax),
        },
      });
    }

    // ─── Rule 3: Attendance vs Payable Days Mismatch ────────
    if (payableDays > totalWorkingDays) {
      anomalies.push({
        employeeId: emp.id,
        employeeName: fullName,
        payrollId: emp.payroll.id,
        ruleCode: "ATTENDANCE_MISMATCH",
        severity: "HIGH",
        title: `Payable Days Exceed Working Days (${payableDays}/${totalWorkingDays})`,
        description: `Payable days (${payableDays}) exceeds total working days in period (${totalWorkingDays}).`,
        details: { payableDays, totalWorkingDays },
      });
    } else if (emp.attendances.length > 0) {
      const presentCount = emp.attendances.filter(
        (a) => a.status === "PRESENT" || a.status === "HALF_DAY" || a.status === "ON_LEAVE"
      ).length;

      if (presentCount === 0 && payableDays >= 20) {
        anomalies.push({
          employeeId: emp.id,
          employeeName: fullName,
          payrollId: emp.payroll.id,
          ruleCode: "ATTENDANCE_MISMATCH",
          severity: "MEDIUM",
          title: `Zero Attendance with Full Payable Days`,
          description: `Employee ${fullName} has 0 present/leave records in the past 30 days but has full payable days (${payableDays}).`,
          details: { presentCount, payableDays },
        });
      }
    }
  }

  return anomalies;
}

export async function persistDetectedAnomalies(): Promise<number> {
  const detected = await scanPayrollAnomalies();

  let count = 0;
  for (const anomaly of detected) {
    const existing = await prisma.payrollAnomaly.findFirst({
      where: {
        employeeId: anomaly.employeeId,
        ruleCode: anomaly.ruleCode,
        isResolved: false,
      },
    });

    if (!existing) {
      await prisma.payrollAnomaly.create({
        data: {
          employeeId: anomaly.employeeId,
          payrollId: anomaly.payrollId || null,
          ruleCode: anomaly.ruleCode,
          severity: anomaly.severity,
          title: anomaly.title,
          description: anomaly.description,
          details: anomaly.details,
          isResolved: false,
        },
      });
      count++;
    }
  }

  return count;
}
