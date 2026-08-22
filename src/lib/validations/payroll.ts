/**
 * Zod Validation Schemas for Payroll API
 */

import { z } from "zod/v4";

export const updateWageSchema = z.object({
  wage: z.number().positive("Wage must be a positive number").min(10000, "Minimum wage is ₹10,000"),
});

export const updateSalaryConfigSchema = z.object({
  pfEmployeeRate: z.number().min(0).max(1).optional(),
  pfEmployerRate: z.number().min(0).max(1).optional(),
  professionalTax: z.number().min(0).optional(),
  standardAllowance: z.number().min(0).optional(),
  performanceBonusRate: z.number().min(0).max(1).optional(),
  ltaRate: z.number().min(0).max(1).optional(),
});

export type UpdateWageInput = z.infer<typeof updateWageSchema>;
export type UpdateSalaryConfigInput = z.infer<typeof updateSalaryConfigSchema>;
