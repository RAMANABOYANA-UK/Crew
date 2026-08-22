import type { SalaryComponentRow, SalaryRates, SalaryBreakdown as UISalaryBreakdown } from '@/types';

// =============================================================
// Frontend UI Salary Constants & Functions
// =============================================================

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

export function computeSalary(
  wageMonthly: number,
  rows: SalaryComponentRow[],
  pfEmployeePct: number,
  pfEmployerPct: number,
  professionalTax: number,
): UISalaryBreakdown {
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

// =============================================================
// Backend Calculation Engine & Models
// =============================================================

export interface SalaryConfigInput {
  pfEmployeeRate: number;   // e.g. 0.12 for 12%
  pfEmployerRate: number;   // e.g. 0.12 for 12%
  professionalTax: number;  // flat amount, e.g. 200
  standardAllowance: number; // flat amount, e.g. 4167
  performanceBonusRate: number; // e.g. 0.0833 for 8.33%
  ltaRate: number;           // e.g. 0.0833 for 8.33%
}

export interface BackendSalaryBreakdown {
  wage: number;
  basicSalary: number;
  hra: number;
  standardAllowance: number;
  performanceBonus: number;
  lta: number;
  fixedAllowance: number;
  pfEmployee: number;
  pfEmployer: number;
  professionalTax: number;
  grossSalary: number;
  totalDeductions: number;
  netPayable: number;
}

export const DEFAULT_SALARY_CONFIG: SalaryConfigInput = {
  pfEmployeeRate: 0.12,
  pfEmployerRate: 0.12,
  professionalTax: 200,
  standardAllowance: 4167,
  performanceBonusRate: 0.0833,
  ltaRate: 0.0833,
};

export function computeSalaryBreakdown(
  wage: number,
  config: SalaryConfigInput = DEFAULT_SALARY_CONFIG
): BackendSalaryBreakdown {
  const basicSalary = round(wage * 0.5);
  const hra = round(basicSalary * 0.5);
  const standardAllowance = round(config.standardAllowance);
  const performanceBonus = round(basicSalary * config.performanceBonusRate);
  const lta = round(basicSalary * config.ltaRate);

  const otherComponentsSum = basicSalary + hra + standardAllowance + performanceBonus + lta;
  const fixedAllowance = round(wage - otherComponentsSum);

  if (fixedAllowance < 0) {
    throw new Error(
      `Invalid wage: ₹${wage}. The sum of salary components (₹${otherComponentsSum}) exceeds the wage. ` +
      `Fixed Allowance would be negative (₹${fixedAllowance}). Increase the wage or adjust component rates.`
    );
  }

  const grossSalary = basicSalary + hra + standardAllowance + performanceBonus + lta + fixedAllowance;
  if (Math.abs(grossSalary - wage) > 0.01) {
    throw new Error(
      `Salary computation error: gross salary (₹${grossSalary}) does not equal wage (₹${wage}).`
    );
  }

  const pfEmployee = round(basicSalary * config.pfEmployeeRate);
  const pfEmployer = round(basicSalary * config.pfEmployerRate);
  const professionalTax = round(config.professionalTax);

  const totalDeductions = pfEmployee + professionalTax;
  const netPayable = round(grossSalary - totalDeductions);

  return {
    wage,
    basicSalary,
    hra,
    standardAllowance,
    performanceBonus,
    lta,
    fixedAllowance,
    pfEmployee,
    pfEmployer,
    professionalTax,
    grossSalary,
    totalDeductions,
    netPayable,
  };
}

export function computeProratedPayroll(
  breakdown: BackendSalaryBreakdown,
  payableDays: number,
  totalWorkingDays: number
): number {
  if (totalWorkingDays <= 0) return 0;
  if (payableDays >= totalWorkingDays) return breakdown.netPayable;

  const ratio = payableDays / totalWorkingDays;
  const proratedGross = round(breakdown.grossSalary * ratio);
  const proratedPf = round(breakdown.pfEmployee * ratio);
  const proratedTax = round(breakdown.professionalTax);
  const proratedNet = round(proratedGross - proratedPf - proratedTax);

  return Math.max(0, proratedNet);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
