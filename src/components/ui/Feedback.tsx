import { Plane, X } from 'lucide-react';
import type { RequestStatus } from '@/types';
import { useToasts, type ToastTone } from '@/lib/store';

// =============================================================
// Feedback atoms — badges, status indicators (§2.1a), toasts
// =============================================================

export function StatusBadge({ status }: { status: RequestStatus }) {
  const map: Record<RequestStatus, { cls: string; label: string }> = {
    pending: { cls: 'crew-badge--pending', label: 'Pending' },
    approved: { cls: 'crew-badge--approved', label: 'Approved' },
    rejected: { cls: 'crew-badge--rejected', label: 'Rejected' },
  };
  const m = map[status];
  return <span className={`crew-badge ${m.cls}`}>{m.label}</span>;
}

/** Employee card top-right indicator per §2.1a. */
export function EmployeeStatusIndicator({
  state,
  leaveLabel = 'On leave',
}: {
  state: 'present' | 'leave' | 'absent';
  leaveLabel?: string;
}) {
  if (state === 'leave') {
    return (
      <span className="crew-status-indicator" title={leaveLabel}>
        <Plane size={14} style={{ color: 'var(--color-flight)' }} aria-hidden />
        <span>{leaveLabel}</span>
      </span>
    );
  }
  if (state === 'present') {
    return (
      <span className="crew-status-indicator crew-status-indicator--green">
        <span className="crew-dot crew-dot--green" aria-hidden />
        <span>Present</span>
      </span>
    );
  }
  return (
    <span className="crew-status-indicator crew-status-indicator--yellow">
      <span className="crew-dot crew-dot--yellow" aria-hidden />
      <span>Absent</span>
    </span>
  );
}

/** Small dot used next to the shell avatar. */
export function ShellStatusDot({ state }: { state: 'green' | 'gray' }) {
  return <span className={`crew-dot ${state === 'green' ? 'crew-dot--green' : 'crew-dot--gray'}`} aria-label={state === 'green' ? 'Checked in' : 'Not checked in'} />;
}

// -------------------------------------------------------------
// Toast stack
// -------------------------------------------------------------
const TOAST_ICON: Record<ToastTone, React.ReactNode> = {
  success: <span style={{ color: 'var(--color-success)' }}>✓</span>,
  error: <X size={15} style={{ color: 'var(--color-danger)' }} />,
  info: <span style={{ color: 'var(--color-info)' }}>i</span>,
};

export function ToastStack() {
  const { toasts } = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div className="crew-toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`crew-toast crew-toast--${t.tone}`} role="status">
          <span className="crew-toast__icon" aria-hidden>{TOAST_ICON[t.tone]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-section)] text-muted">
        {icon}
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="max-w-sm text-[13px] text-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}