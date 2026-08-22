import { useMemo, useState } from 'react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Clock3, Coffee } from 'lucide-react';
import { api } from '@/lib/api';
import { QK } from '@/lib/queryKeys';
import { useSession } from '@/lib/store';
import { durationMinutes, fmtHours } from '@/lib/utils';
import { computePayableDays } from '@/lib/payable';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/Feedback';
import { CheckInOutWidget } from './CheckInOutWidget';
import type { AttendanceRecord } from '@/types';

/** §7.2 + §7.3 — Employee's attendance with payroll-derived payable days. */
export function MyAttendance() {
  const { user } = useSession();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const from = format(month, 'yyyy-MM-dd');
  const to = format(endOfMonth(month), 'yyyy-MM-dd');

  const attQ = useQuery({
    queryKey: QK.attendance(user!.id, from, to),
    queryFn: () => api.getAttendance({ employeeId: user!.id, from, to }),
  });
  // §7.3 — attendance + approved (paid) leave is the payroll source of truth.
  const tofQ = useQuery({ queryKey: QK.timeOff(user!.id), queryFn: () => api.getTimeOff({ employeeId: user!.id }) });

  const stats = useMemo(
    () => computePayableDays(attQ.data ?? [], tofQ.data ?? [], from, to),
    [attQ.data, tofQ.data, from, to],
  );

  const sorted = [...(attQ.data ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Attendance</h1>
          <p className="text-[13px] text-muted">Day-wise view · {format(month, 'MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthNav
            month={month}
            onPrev={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            onNext={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          />
          <div className="hidden lg:block"><CheckInOutWidget /></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatChip label="Out" value={String(stats.unpaidPenaltyDays)} hint="absences + unpaid leave" />
        <StatChip label="Days present" value={String(stats.presentDays)} hint={`${stats.halfDays} half-day counted as 1`} />
        <StatChip label="Paid leaves" value={String(stats.leaveDays)} hint="approved PTO / sick" />
        <StatChip label="Payable days" value={String(stats.payableDays)} hint="attendance + paid leave" />
        <StatChip label="Working days" value={String(stats.totalWorkingDays)} hint={stats.unpaidPenaltyDays > 0 ? `−${stats.unpaidPenaltyDays} unpaid` : 'fully payable'} />
      </div>

      {attQ.isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : sorted.length === 0 ? (
        <div className="crew-card">
          <EmptyState icon={<Clock3 size={20} />} title="No attendance records for this month yet" hint="Check back after your first day, or record a Check In today." />
        </div>
      ) : (
        <AttendanceTable rows={sorted} />
      )}

      <p className="text-[11.5px] text-faint">
        §7.3 — Payroll line: Payable days = present + half-day + approved paid leave. Unpaid leave
        and missing attendance automatically reduce payable days (shown as “Out”).
      </p>
    </div>
    );
}

function MonthNav({ month, onPrev, onNext }: { month: Date; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-line bg-cloud px-1 py-1">
      <button
        onClick={onPrev}
        aria-label="Previous month"
        className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-muted hover:bg-[var(--color-section)] crew-focusable"
      >
        ‹
      </button>
      <span className="min-w-[110px] text-center text-[13px] font-semibold">{format(month, 'MMM yyyy')}</span>
      <button
        onClick={onNext}
        aria-label="Next month"
        className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-muted hover:bg-[var(--color-section)] crew-focusable"
      >
        ›
      </button>
    </div>
  );
}

function StatChip({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="crew-stat">
      <p className="crew-stat__label">{label}</p>
      <p className="crew-stat__value">{value}</p>
      {hint && <p className="mt-0.5 text-[11.5px] text-faint">{hint}</p>}
    </div>
  );
}

function AttendanceTable({ rows }: { rows: AttendanceRecord[] }) {
  return (
    <div className="crew-table-wrap">
      <table className="crew-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Check In</th>
            <th>Check Out</th>
            <th className="crew-table--num">Work Hours</th>
            <th className="crew-table--num">Extra Hours</th>
            <th>Breaks</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((rec) => {
            const workMin = rec.checkIn && rec.checkOut
              ? Math.max(0, durationMinutes(rec.checkIn, rec.checkOut) - (rec.breakMinutes ?? 0))
              : 0;
            return (
              <tr key={rec.id}>
                <td className="font-medium">{format(parseISO(rec.date), 'EEE, dd MMM yyyy')}</td>
                <td>{rec.checkIn ?? '—'}</td>
                <td>{rec.checkOut ?? '—'}</td>
                <td className="crew-table--num">{rec.checkIn && rec.checkOut ? fmtHours(workMin) : '—'}</td>
                <td className="crew-table--num">{workMin > 480 ? fmtHours(workMin - 480) : '—'}</td>
                <td>
                  {rec.breakMinutes > 0 ? (
                    <span className="flex items-center gap-1 text-muted" title="Break time included">
                      <Coffee size={13} /> {fmtHours(rec.breakMinutes)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td><AttendanceBadge status={rec.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AttendanceBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    present: { cls: 'crew-badge--approved', label: 'Present' },
    'half-day': { cls: 'crew-badge--half', label: 'Half-day' },
    leave: { cls: 'crew-badge--flight', label: 'Leave' },
    absent: { cls: 'crew-badge--rejected', label: 'Absent' },
  };
  const m = map[status] ?? { cls: 'crew-badge--neutral', label: status };
  return <span className={`crew-badge ${m.cls}`}>{m.label}</span>;
}

