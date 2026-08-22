"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "green"
  | "amber"
  | "red"
  | "purple"
  | "blue"
  | "gray"
  | "PRESENT"
  | "ABSENT"
  | "HALF_DAY"
  | "ON_LEAVE"
  | "APPROVED"
  | "PENDING"
  | "REJECTED"
  | "ACTIVE"
  | "INACTIVE"
  | "HIGH"
  | "MEDIUM"
  | "LOW";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  size?: "sm" | "md";
}

export function Badge({ children, variant = "gray", className, size = "md" }: BadgeProps) {
  let colorClass = "bg-slate-100 text-slate-700 border-slate-200";

  const v = String(variant).toUpperCase();

  if (["GREEN", "PRESENT", "APPROVED", "ACTIVE", "LOW"].includes(v)) {
    colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200/60";
  } else if (["AMBER", "PENDING", "MEDIUM"].includes(v)) {
    colorClass = "bg-amber-50 text-amber-700 border-amber-200/60";
  } else if (["RED", "REJECTED", "ABSENT", "INACTIVE", "HIGH"].includes(v)) {
    colorClass = "bg-rose-50 text-rose-700 border-rose-200/60";
  } else if (["PURPLE", "BLUE", "ON_LEAVE", "HALF_DAY"].includes(v)) {
    colorClass = "bg-violet-50 text-violet-700 border-violet-200/60";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium border rounded-full transition-colors",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        colorClass,
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          ["GREEN", "PRESENT", "APPROVED", "ACTIVE", "LOW"].includes(v) && "bg-emerald-500",
          ["AMBER", "PENDING", "MEDIUM"].includes(v) && "bg-amber-500",
          ["RED", "REJECTED", "ABSENT", "INACTIVE", "HIGH"].includes(v) && "bg-rose-500",
          ["PURPLE", "BLUE", "ON_LEAVE", "HALF_DAY"].includes(v) && "bg-violet-500"
        )}
      />
      <span>{children}</span>
    </span>
  );
}
