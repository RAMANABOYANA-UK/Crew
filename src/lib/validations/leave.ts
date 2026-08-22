/**
 * Zod Validation Schemas for Leave API
 */

import { z } from "zod/v4";

export const leaveRequestSchema = z.object({
  leaveType: z.enum(["PAID", "SICK", "UNPAID", "CASUAL"]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().min(5, "Reason must be at least 5 characters").max(500),
}).refine(
  (data) => data.endDate >= data.startDate,
  { message: "End date must be on or after start date" }
);

export const leaveReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  adminComment: z.string().max(500).optional(),
});

export const leaveQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  employeeId: z.string().optional(),
});

export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
export type LeaveReviewInput = z.infer<typeof leaveReviewSchema>;
export type LeaveQuery = z.infer<typeof leaveQuerySchema>;
