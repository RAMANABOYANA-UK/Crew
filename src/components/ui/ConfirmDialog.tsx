"use client";

import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: "danger" | "primary";
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  variant = "danger",
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h4 className="text-base font-semibold text-slate-900">{title}</h4>
          <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
        </div>

        <div className="flex items-center justify-end gap-3 w-full pt-2">
          <Button variant="outline" size="md" onClick={onClose} disabled={isLoading} className="w-full">
            {cancelText}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            size="md"
            onClick={onConfirm}
            isLoading={isLoading}
            className="w-full"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
