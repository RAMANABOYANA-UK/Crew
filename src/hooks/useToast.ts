"use client";

import { useState, useCallback, useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

let toastListeners: Array<(toasts: ToastItem[]) => void> = [];
let memoryToasts: ToastItem[] = [];

function notifyListeners() {
  toastListeners.forEach((listener) => listener([...memoryToasts]));
}

export function toast(message: string, type: ToastType = "info", title?: string) {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: ToastItem = { id, message, type, title };
  memoryToasts = [...memoryToasts, newToast];
  notifyListeners();

  setTimeout(() => {
    memoryToasts = memoryToasts.filter((t) => t.id !== id);
    notifyListeners();
  }, 4000);
}

toast.success = (message: string, title?: string) => toast(message, "success", title);
toast.error = (message: string, title?: string) => toast(message, "error", title);
toast.info = (message: string, title?: string) => toast(message, "info", title);
toast.warning = (message: string, title?: string) => toast(message, "warning", title);

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>(memoryToasts);

  useEffect(() => {
    toastListeners.push(setToasts);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setToasts);
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    memoryToasts = memoryToasts.filter((t) => t.id !== id);
    notifyListeners();
  }, []);

  return { toasts, removeToast, toast };
}
