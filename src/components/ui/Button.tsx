"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-violet-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer",
          // Radius
          "rounded-lg",
          // Size
          size === "sm" && "h-8 px-3 text-xs gap-1.5",
          size === "md" && "h-10 px-4 text-sm gap-2",
          size === "lg" && "h-12 px-6 text-base gap-2.5",
          // Variant
          variant === "primary" &&
            "bg-violet-600 hover:bg-violet-700 text-white shadow-xs shadow-violet-600/20",
          variant === "secondary" &&
            "bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200/60",
          variant === "outline" &&
            "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300",
          variant === "ghost" &&
            "bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900",
          variant === "danger" &&
            "bg-rose-600 hover:bg-rose-700 text-white shadow-xs shadow-rose-600/20",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
