// =============================================================
// Crew HRMS — client state (Zustand). UI-only state lives here;
// server data comes through React Query → lib/api.
// =============================================================
import { create } from 'zustand';
import type { Company, Employee } from '@/types';

const SESSION_KEY = 'crew-session-v1';

interface SessionState {
  user: Employee | null;
  company: Company | null;
  role: 'admin' | 'employee';
  setSession: (user: Employee, company: Company) => void;
  setUser: (user: Employee) => void;
  setCompany: (company: Company) => void;
  clearSession: () => void;
}

function readSession(): { user: Employee | null; company: Company | null } {
  try {
    const raw = globalThis.localStorage?.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { user: parsed.user ?? null, company: parsed.company ?? null };
    }
  } catch { /* noop */ }
  return { user: null, company: null };
}

const initial = readSession();

export const useSession = create<SessionState>((set) => ({
  user: initial.user,
  company: initial.company,
  role: initial.user?.role ?? 'employee',
  setSession: (user, company) => {
    globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify({ user, company }));
    set({ user, company, role: user.role });
  },
  setUser: (user) => {
    set((s) => {
      const next = { ...s, user, role: user.role };
      globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify({ user, company: s.company }));
      return next;
    });
  },
  setCompany: (company) => {
    set((s) => {
      globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify({ user: s.user, company }));
      return { ...s, company };
    });
  },
  clearSession: () => {
    globalThis.localStorage?.removeItem(SESSION_KEY);
    set({ user: null, company: null, role: 'admin' });
  },
}));

// -------------------------------------------------------------
// Toasts — a tiny UI-store so any feature can surface feedback
// without coupling to a component tree.
// -------------------------------------------------------------
export type ToastTone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}
interface ToastState {
  toasts: Toast[];
  toast: (tone: ToastTone, message: string) => void;
  dismiss: (id: number) => void;
}
let toastSeq = 1;
export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  toast: (tone, message) => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts, { id, tone, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));