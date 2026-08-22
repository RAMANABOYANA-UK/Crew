"use client";

import React, { useState } from "react";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface AvatarProps {
  src?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Avatar({ src, firstName, lastName, size = "md", className }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(firstName, lastName);

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-xl",
  };

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={`${firstName || "User"} avatar`}
        onError={() => setImageError(true)}
        className={cn(
          "rounded-full object-cover border border-slate-200 shadow-xs shrink-0",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-violet-100 text-violet-700 font-semibold border border-violet-200/80 flex items-center justify-center shrink-0 tracking-wider shadow-xs",
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
