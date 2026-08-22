/**
 * Immutable Audit Logger for Dayflow HRMS
 * 
 * Records system events with actor info, action, entity, before/after states,
 * IP address, and user agent.
 */

import { headers } from "next/headers";
import { prisma } from "./prisma";
import { Prisma } from "../generated/prisma/client";

export interface LogAuditOptions {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAuditEvent(options: LogAuditOptions) {
  try {
    let ip = options.ipAddress;
    let ua = options.userAgent;

    if (!ip || !ua) {
      try {
        const headerStore = await headers();
        if (!ip) {
          ip =
            headerStore.get("x-forwarded-for")?.split(",")[0].trim() ||
            headerStore.get("x-real-ip") ||
            "127.0.0.1";
        }
        if (!ua) {
          ua = headerStore.get("user-agent") || undefined;
        }
      } catch {
        // Headers not available in script contexts
      }
    }

    const log = await prisma.auditLog.create({
      data: {
        actorId: options.actorId || null,
        actorEmail: options.actorEmail || null,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId || null,
        oldValues: options.oldValues ? options.oldValues : undefined,
        newValues: options.newValues ? options.newValues : undefined,
        ipAddress: ip || "127.0.0.1",
        userAgent: ua || null,
      },
    });

    return log;
  } catch (error) {
    console.error("Failed to write audit log entry:", error);
    return null;
  }
}
