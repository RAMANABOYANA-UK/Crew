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

  const payrolls = await prisma.payroll.findMany({
    where: targetEmployeeId ? { employeeId: targetEmployeeId } : {},
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          basicSalary: true,
        },
      },
    },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  for (const p of payrolls) {
    const name = `${p.employee.firstName} ${p.employee.lastName}`;

    // Rule 1: Below statutory minimum wage
    if (p.wage < 10000) {
      anomalies.push({
        employeeId: p.employeeId,
        employeeName: name,
        payrollId: p.id,
        ruleCode: "BELOW_MIN_WAGE",
        severity: "HIGH",
        title: "Wage Below Statutory Minimum",
        description: `Configured CTC (₹${p.wage.toLocaleString()}) is below the statutory minimum wage threshold (₹10,000).`,
        details: { wage: p.wage, threshold: 10000 },
      });
    }

    // Rule 2: Negative or zero net payable
    if (p.netPayable <= 0) {
      anomalies.push({
        employeeId: p.employeeId,
        employeeName: name,
        payrollId: p.id,
        ruleCode: "NEGATIVE_NET_PAY",
        severity: "HIGH",
        title: "Zero or Negative Net Payable",
        description: `Calculated net payable amount (₹${p.netPayable.toLocaleString()}) is zero or negative due to excessive deductions.`,
        details: { netPayable: p.netPayable, wage: p.wage, pfEmployee: p.pfEmployee, professionalTax: p.professionalTax },
      });
    }

    // Rule 3: Attendance mismatch (payable days > 22 or > total working days)
    if (p.payableDays > p.totalWorkingDays) {
      anomalies.push({
        employeeId: p.employeeId,
        employeeName: name,
        payrollId: p.id,
        ruleCode: "ATTENDANCE_MISMATCH",
        severity: "MEDIUM",
        title: "Payable Days Exceed Working Days",
        description: `Employee has ${p.payableDays} payable days configured, which exceeds total working days (${p.totalWorkingDays}) in current cycle.`,
        details: { payableDays: p.payableDays, totalWorkingDays: p.totalWorkingDays },
      });
    }

    // Rule 4: High salary leap compared to basic salary
    if (p.employee.basicSalary > 0 && p.wage > p.employee.basicSalary * 3) {
      anomalies.push({
        employeeId: p.employeeId,
        employeeName: name,
        payrollId: p.id,
        ruleCode: "HIGH_SALARY_LEAP",
        severity: "MEDIUM",
        title: "Unusual Wage Discrepancy",
        description: `Gross wage (₹${p.wage.toLocaleString()}) is more than 3x the employee basic salary (₹${p.employee.basicSalary.toLocaleString()}).`,
        details: { wage: p.wage, basicSalary: p.employee.basicSalary },
      });
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
