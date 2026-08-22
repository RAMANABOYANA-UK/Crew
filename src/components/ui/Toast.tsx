"use client";

import React from "react";
import { useToast } from "@/hooks/useToast";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => {
        const isSuccess = t.type === "success";
        const isError = t.type === "error";
        const isWarning = t.type === "warning";

        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-200 animate-in slide-in-from-bottom-2 bg-white",
              isSuccess && "border-emerald-200 text-emerald-950 bg-emerald-50/50",
              isError && "border-rose-200 text-rose-950 bg-rose-50/50",
              isWarning && "border-amber-200 text-amber-950 bg-amber-50/50",
              !isSuccess && !isError && !isWarning && "border-slate-200 text-slate-900 bg-white"
            )}
          >
            <div className="mt-0.5 shrink-0">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {isError && <XCircle className="w-5 h-5 text-rose-600" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-600" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-violet-600" />}
            </div>

            <div className="flex-1 min-w-0">
              {t.title && <h4 className="text-sm font-semibold mb-0.5">{t.title}</h4>}
              <p className="text-xs text-slate-600 leading-relaxed">{t.message}</p>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 -mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
