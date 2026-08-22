// =============================================================
// Crew HRMS — Salary calculation engine  (§6.6 / §9)
//
// Component amounts are ALWAYS computed from the defined wage —
// users can only edit the % / fixed-amount driver, never the
// calculated value. The FIXED ALLOWANCE is the auto-balanced
// remainder so all components always equal the total wage.
//
// Worked validation (from brief):
//   Wage = ₹150,000, Basic = 50% of wage        → Basic = ₹75,000
//   HRA  = 50% of Basic                          → HRA  = ₹37,500
//   Standard 4% → ₹6,000 | Bonus 9.33% → ₹13,995
//   LTA 8.33% → ₹12,495 | Fixed allowance = remainder
// =============================================================
import type { SalaryBreakdown, SalaryComponentRow, SalaryRates } from '@/types';

export const DEFAULT_SALARY_RATES: SalaryRates = {
  basicPct: 50,
  hraPctOfBasic: 50,
  standardPct: 4,
  performancePct: 9.33,
  ltaPct: 8.33,
  pfEmployeePct: 12,
  pfEmployerPct: 12,
  professionalTax: 200,
};

export function roundMO(n: number): number {
  return Math.round(n * 100) / 100;
}

export function defaultBreakdownRows(rates: SalaryRates = DEFAULT_SALARY_RATES): SalaryComponentRow[] {
  return [
    { key: 'basic', rule: 'percent-wage', label: 'Basic Salary', ratePct: rates.basicPct, fixedAmount: 0, note: 'Base for other %-based components' },
    { key: 'hra', rule: 'percent-basic', label: 'House Rent Allowance (HRA)', ratePct: rates.hraPctOfBasic, fixedAmount: 0, note: '50% of Basic' },
    { key: 'standard', rule: 'percent-wage', label: 'Standard Allowance', ratePct: rates.standardPct, fixedAmount: 0 },
    { key: 'performance', rule: 'percent-wage', label: 'Performance Bonus', ratePct: rates.performancePct, fixedAmount: 0 },
    { key: 'lta', rule: 'percent-wage', label: 'Leave Travel Allowance', ratePct: rates.ltaPct, fixedAmount: 0 },
    { key: 'fixed', rule: 'balancing', label: 'Fixed Allowance', ratePct: 0, fixedAmount: 0, note: 'Auto-calculated balancing amount' },
  ];
}

/**
 * Compute the full salary breakdown for a monthly wage.
 * Non-balancing rows are validated: if their sum would exceed the
 * wage, `overWage` is true and the balancing row renders ₹0 with a
 * warning surfaced by the caller (§6.6 validation rule).
 */
export function computeSalary(
  wageMonthly: number,
  rows: SalaryComponentRow[],
  pfEmployeePct: number,
  pfEmployerPct: number,
  professionalTax: number,
): SalaryBreakdown {
  const withAmts: SalaryComponentRow[] = rows.map((r) => {
    if (r.rule === 'percent-wage') {
      return { ...r, fixedAmount: roundMO((wageMonthly * r.ratePct) / 100) };
    }
    if (r.rule === 'percent-basic') {
      const basicPct = rows.find((x) => x.key === 'basic')?.ratePct ?? 0;
      return { ...r, fixedAmount: roundMO((wageMonthly * (basicPct / 100) * r.ratePct) / 100) };
    }
    return { ...r };
  });

  const fixedRows = withAmts.filter((r) => r.rule !== 'balancing');
  const fixedSum = roundMO(fixedRows.reduce((s, r) => s + r.fixedAmount, 0));
  const overWage = fixedSum > wageMonthly;

  const balanced = withAmts.map((r) => {
    if (r.rule !== 'balancing') return r;
    return { ...r, fixedAmount: overWage ? 0 : roundMO(wageMonthly - fixedSum) };
  });

  const totalComponents = roundMO(balanced.reduce((s, r) => s + r.fixedAmount, 0));
  const pfEmployee = roundMO((wageMonthly * pfEmployeePct) / 100);
  const pfEmployer = roundMO((wageMonthly * pfEmployerPct) / 100);
  const grossMonthly = totalComponents;
  const monthlyDeductions = roundMO(pfEmployee + professionalTax);
  const netMonthly = roundMO(grossMonthly - monthlyDeductions);

  return {
    rows: balanced,
    totalComponents,
    overWage,
    pfEmployee,
    pfEmployer,
    professionalTax,
    grossMonthly,
    monthlyDeductions,
    netMonthly,
    yearlyNet: netMonthly * 12,
  };
}

export function initRates(patch: Partial<SalaryRates> = {}): SalaryRates {
  return { ...DEFAULT_SALARY_RATES, ...patch };
}