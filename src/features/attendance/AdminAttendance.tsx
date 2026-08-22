import { useMemo, useState } from 'react';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { QK } from '@/lib/queryKeys';
import { durationMinutes, fmtHours } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Inputs';
import { Segmented } from '@/components/ui/Tabs';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { resolveEmployeeStatus } from '@/lib/status';
import type { AttendanceRecord, Employee, TimeOffRequest } from '@/types';

/**
 * §7.1 — Admin/HR attendance list. Date navigator + Day/Week toggle,
 * one row per employee. Defaults to today.
 */
export function AdminAttendance() {
  const [cursor, setCursor] = useState(new Date());
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [query, setQuery] = useState('');

  const dayISO = format(cursor, 'yyyy-MM-dd');
  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });

  const range =
    mode === 'day'
      ? { from: dayISO, to: dayISO }
      : { from: format(weekStart, 'yyyy-MM-dd'), to: format(addDays(weekStart, 6), 'yyyy-MM-dd') };

  const empQ = useQuery({ queryKey: QK.employees, queryFn: () => api.getEmployees() });
  const attQ = useQuery({
    queryKey: QK.attendance(undefined, range.from, range.to),
    queryFn: () => api.getAttendance({ from: range.from, to: range.to }),
  });
  const tofQ = useQuery({ queryKey: QK.timeOff(), queryFn: () => api.getTimeOff() });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const emps = empQ.data ?? [];
    return q
      ? emps.filter((e) => `${e.firstName} ${e.lastName} ${e.department} ${e.loginId}`.toLowerCase().includes(q))
      : emps;
  }, [empQ.data, query]);

  const isLoading = empQ.isLoading || attQ.isLoading;

  function step(dir: 1 | -1) {
    setCursor((c) => (mode === 'day' ? addDays(c, dir) : addDays(c, dir * 7)));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
          <p className="text-[13px] text-muted">All employees for the selected {mode}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-line bg-cloud px-1 py-1">
            <button onClick={() => step(-1)} aria-label="Previous" className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-muted transition hover:bg-[var(--color-section)] crew-focusable">
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={dayISO}
              onChange={(e) => e.target.value && setCursor(parseISO(e.target.value))}
              className="crew-input border-0 bg-transparent px-1 text-center text-[13px]"
              aria-label="Pick date"
            />
            <button onClick={() => step(1)} aria-label="Next" className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-muted hover:bg-[var(--color-section)] crew-focusable">
              <ChevronRight size={16} />
            </button>
          </div>
          <Segmented
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
            ]}
            value={mode}
            onChange={setMode}
            ariaLabel="Attendance view"
          />
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <Input placeholder="Filter by name or department…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" aria-label="Search attendance" />
      </div>

      {isLoading ? (
        <TableSkeleton rows={7} cols={6} />
      ) : mode === 'day' ? (
        <DayTable emps={filtered} records={attQ.data ?? []} requests={tofQ.data ?? []} date={dayISO} />
      ) : (
        <WeekTable emps={filtered} records={attQ.data ?? []} requests={tofQ.data ?? []} weekStart={weekStart} />
      )}
    </div>
  );
}
function DayTable({ emps, records, requests, date }: { emps: Employee[]; records: AttendanceRecord[]; requests: TimeOffRequest[]; date: string }) {
  return (
    <div className="crew-table-wrap">
      <table className="crew-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Day</th>
            <th>Check In</th>
            <th>Check Out</th>
            <th className="crew-table--num">Work Hours</th>
            <th className="crew-table--num">Extra Hours</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {emps.map((emp) => {
            const rec = records.find((r) => r.employeeId === emp.id);
            const status = resolveEmployeeStatus(rec, requests, date);
            const workMin = rec?.checkIn && rec?.checkOut ? Math.max(0, durationMinutes(rec.checkIn, rec.checkOut) - (rec?.breakMinutes ?? 0)) : 0;
            return (
              <tr key={emp.id}>
                <td>
                  <span className="flex items-center gap-2.5">
                    <Avatar name={`${emp.firstName} ${emp.lastName}`} photo={emp.photo} color={emp.avatarColor} size={30} />
                    <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                  </span>
                </td>
                <td className="text-muted">{format(parseISO(date), 'EEE, dd MMM')}</td>
                <td>{rec?.checkIn ?? '—'}</td>
                <td>{rec?.checkOut ?? '—'}</td>
                <td className="crew-table--num">{rec?.checkIn && rec?.checkOut ? fmtHours(workMin) : '—'}</td>
                <td className="crew-table--num">{workMin > 480 ? fmtHours(workMin - 480) : '—'}</td>
                <td>
                  {status === 'present' ? (
                    <span className="crew-badge crew-badge--approved">Present</span>
                  ) : status === 'leave' ? (
                    <span className="crew-badge crew-badge--flight">On leave</span>
                  ) : rec?.status === 'half-day' ? (
                    <span className="crew-badge crew-badge--half">Half-day</span>
                  ) : (
                    <span className="crew-badge crew-badge--rejected">Absent</span>
                  )}
                </td>
              </tr>
            );
          })}
          {emps.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-muted">No employees found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function WeekTable({ emps, records, requests, weekStart }: { emps: Employee[]; records: AttendanceRecord[]; requests: TimeOffRequest[]; weekStart: Date }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <div className="crew-table-wrap">
      <table className="crew-table">
        <thead>
          <tr>
            <th>Employee</th>
            {days.map((d) => (
              <th key={d.toISOString()} className="text-center">{format(d, 'EEE dd')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {emps.map((emp) => (
            <tr key={emp.id}>
              <td className="font-medium">{emp.firstName} {emp.lastName}</td>
              {days.map((d) => {
                const iso = format(d, 'yyyy-MM-dd');
                const rec = records.find((r) => r.employeeId === emp.id && r.date === iso);
                const status = resolveEmployeeStatus(rec, requests, iso);
                const weekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <td key={iso} className="text-center">
                    {weekend ? (
                      <span className="text-faint">—</span>
                    ) : status === 'present' ? (
                      <span className="crew-dot crew-dot--green" title="Present" />
                    ) : status === 'leave' ? (
                      <span className="crew-badge crew-badge--flight" style={{ fontSize: 10 }}>Leave</span>
                    ) : rec?.status === 'half-day' ? (
                      <span className="crew-badge crew-badge--half" style={{ fontSize: 10 }}>½</span>
                    ) : (
                      <span className="crew-dot crew-dot--yellow" title="Absent (no time off applied)" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {emps.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-muted">No employees found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}