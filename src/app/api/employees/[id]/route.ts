import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateEmployeeSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  role: z.enum(["ADMIN", "HR", "EMPLOYEE"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  basicSalary: z.number().optional(),
  hra: z.number().optional(),
  allowances: z.number().optional(),
  reason: z.string().optional(), // Mandatory when sensitive fields change
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            role: true,
            loginId: true,
            createdAt: true,
            mustChangePassword: true,
          },
        },
        jobHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const body = await req.json();
    const parsed = updateEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          data: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const current = await prisma.employee.findUnique({
      where: { id },
    });

    if (!current) {
      return NextResponse.json(
        { success: false, message: "Employee not found" },
        { status: 404 }
      );
    }

    const updateData = parsed.data;
    const { reason, ...dataToUpdate } = updateData;

    // Check sensitive field changes: department, designation, status, role
    const sensitiveFields = ["department", "designation", "status", "role"] as const;
    const changedSensitiveFields: Array<typeof sensitiveFields[number]> = [];

    for (const field of sensitiveFields) {
      if (
        dataToUpdate[field] !== undefined &&
        String(dataToUpdate[field]) !== String(current[field])
      ) {
        changedSensitiveFields.push(field);
      }
    }

    if (changedSensitiveFields.length > 0 && !reason) {
      return NextResponse.json(
        {
          success: false,
          message: `A 'reason' string is required when updating sensitive job fields (${changedSensitiveFields.join(
            ", "
          )}).`,
        },
        { status: 400 }
      );
    }

    // Write job history entries and update employee in a transaction (syncing User.role and Employee.role)
    const updated = await prisma.$transaction(async (tx) => {
      if (changedSensitiveFields.length > 0 && reason) {
        for (const field of changedSensitiveFields) {
          await tx.employeeJobHistory.create({
            data: {
              employeeId: id,
              field,
              oldValue: current[field] ? String(current[field]) : null,
              newValue: String(dataToUpdate[field]),
              reason,
              changedBy: admin.id,
            },
          });
        }
      }

      // If role or status changes, update the linked User account to guarantee role sync
      if (current.userId && (dataToUpdate.role || dataToUpdate.status)) {
        await tx.user.update({
          where: { id: current.userId },
          data: {
            ...(dataToUpdate.role ? { role: dataToUpdate.role } : {}),
          },
        });
      }

      return tx.employee.update({
        where: { id },
        data: dataToUpdate,
        include: {
          jobHistory: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Employee profile updated successfully.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}