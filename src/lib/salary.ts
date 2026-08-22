/**
 * Salary Computation Engine
 * 
 * Implements the full salary formula chain:
 * - Basic Salary = 50% of Wage
 * - HRA = 50% of Basic
 * - Standard Allowance = configurable (default ₹4,167/month)
 * - Performance Bonus = configurable % of Basic (default 8.33%)
 * - LTA = configurable % of Basic (default 8.33%)
 * - Fixed Allowance = Wage − sum of all other components (balancing figure)
 * - PF Employee = configurable % of Basic (default 12%)
 * - PF Employer = configurable % of Basic (default 12%)
 * - Professional Tax = configurable flat amount (default ₹200/month)
 */

export interface SalaryConfigInput {
  pfEmployeeRate: number;   // e.g. 0.12 for 12%
  pfEmployerRate: number;   // e.g. 0.12 for 12%
  professionalTax: number;  // flat amount, e.g. 200
  standardAllowance: number; // flat amount, e.g. 4167
  performanceBonusRate: number; // e.g. 0.0833 for 8.33%
  ltaRate: number;           // e.g. 0.0833 for 8.33%
}

export interface SalaryBreakdown {
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

/**
 * Compute the full salary breakdown from a wage amount.
 * 
 * @param wage - The total CTC / wage amount
 * @param config - Configurable rates (PF, tax, allowances)
 * @returns Full salary breakdown with all components
 * @throws Error if fixedAllowance would be negative (wage too low for components)
 */
export function computeSalaryBreakdown(
  wage: number,
  config: SalaryConfigInput = DEFAULT_SALARY_CONFIG
): SalaryBreakdown {
  const basicSalary = round(wage * 0.5);
  const hra = round(basicSalary * 0.5);
  const standardAllowance = round(config.standardAllowance);
  const performanceBonus = round(basicSalary * config.performanceBonusRate);
  const lta = round(basicSalary * config.ltaRate);

  // Fixed Allowance is the balancing figure
  const otherComponentsSum = basicSalary + hra + standardAllowance + performanceBonus + lta;
  const fixedAllowance = round(wage - otherComponentsSum);

  if (fixedAllowance < 0) {
    throw new Error(
      `Invalid wage: ₹${wage}. The sum of salary components (₹${otherComponentsSum}) exceeds the wage. ` +
      `Fixed Allowance would be negative (₹${fixedAllowance}). Increase the wage or adjust component rates.`
    );
  }

  // Validate: total components must equal wage
  const grossSalary = basicSalary + hra + standardAllowance + performanceBonus + lta + fixedAllowance;
  if (Math.abs(grossSalary - wage) > 0.01) {
    throw new Error(
      `Salary computation error: gross salary (₹${grossSalary}) does not equal wage (₹${wage}).`
    );
  }

  // Deductions
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

/**
 * Compute prorated net payable based on attendance.
 * 
 * @param breakdown - Full salary breakdown
 * @param payableDays - Days the employee actually worked / was on paid leave
 * @param totalWorkingDays - Total working days in the pay period
 * @returns Prorated net payable amount
 */
export function computeProratedPayroll(
  breakdown: SalaryBreakdown,
  payableDays: number,
  totalWorkingDays: number
): number {
  if (totalWorkingDays <= 0) return 0;
  if (payableDays >= totalWorkingDays) return breakdown.netPayable;

  const ratio = payableDays / totalWorkingDays;
  const proratedGross = round(breakdown.grossSalary * ratio);
  const proratedPf = round(breakdown.pfEmployee * ratio);
  const proratedTax = round(breakdown.professionalTax); // Professional tax is flat, not prorated
  const proratedNet = round(proratedGross - proratedPf - proratedTax);

  return Math.max(0, proratedNet);
}

/**
 * Round to 2 decimal places.
 */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
