import { z } from "zod";

export const loginSchema = z.object({
  loginId: z.string().min(1, "Login ID or Email is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters long")
      .regex(
        /[A-Za-z]/,
        "New password must contain at least one letter"
      )
      .regex(
        /[0-9]/,
        "New password must contain at least one number"
      ),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => data.currentPassword !== data.newPassword,
    {
      message: "New password must be different from the current password",
      path: ["newPassword"],
    }
  )
  .refine(
    (data) =>
      data.confirmPassword === undefined ||
      data.newPassword === data.confirmPassword,
    {
      message: "Confirm password does not match new password",
      path: ["confirmPassword"],
    }
  );

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const onboardEmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  loginId: z.string().min(3, "Login ID must be at least 3 characters").optional(),
  initialPassword: z
    .string()
    .min(6, "Initial password must be at least 6 characters")
    .optional(),
  role: z.enum(["ADMIN", "HR", "EMPLOYEE"]).default("EMPLOYEE"),
  department: z.string().optional(),
  designation: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfJoining: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .optional(),
  wage: z.number().min(10000, "Wage must be at least ₹10,000").default(50000),
});

export type OnboardEmployeeInput = z.infer<typeof onboardEmployeeSchema>;
