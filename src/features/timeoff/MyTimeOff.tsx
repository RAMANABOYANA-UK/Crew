import { useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { QK } from '@/lib/queryKeys';
import { useSession } from '@/lib/store';
import { fmtDate } from '@/lib/utils';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { StatusBadge, EmptyState } from '@/components/ui/Feedback';
import { TimeOffRequestModal } from './TimeOffRequestModal';
import type { TimeOffRequest } from '@/types';

/**
 * §8.2 — Employee Time Off: PTO / Sick sub-tabs with balances, a
 * monthly calendar showing existing requests, and an Apply flow.
 */
export function MyTimeOff() {
  const { user } = useSession();
  const [tab, setTab] = useState<'pto' | 'sick'>('pto');
  const [month, setMonth] = useState(() => new Date());
  const [applyOpen, setApplyOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<string | undefined>();

  const reqQ = useQuery({ queryKey: QK.timeOff(user!.id), queryFn: () => api.getTimeOff({ employeeId: user!.id }) });
  const allocQ = useQuery({ queryKey: QK.allocations, queryFn: () => api.getAllocations() });

  const myRequests = (reqQ.data ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const balances = allocQ.data ?? [];
  const pto = balances.find((b) => b.type === 'Paid Time Off');
  const sick = balances.find((b) => b.type === 'Sick Leave');

  const activeType = tab === 'pto' ? 'Paid Time Off' : 'Sick Leave';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Time Off</h1>
          <p className="text-[13px] text-muted">{user?.firstName} {user?.lastName} · {format(month, 'MMMM yyyy')}</p>
        </div>
        <Button onClick={() => { setDraftDate(undefined); setApplyOpen(true); }}>
          <Plus size={15} /> Apply
        </Button>
      </div>

      <Tabs
        items={[
          { id: 'pto', label: 'Paid Time Off' },
          { id: 'sick', label: 'Sick Time Off' },
        ]}
        active={tab}
        onChange={(id) => setTab(id as 'pto' | 'sick')}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="crew-badge crew-badge--approved">{tab === 'pto' ? pto?.defaultDays ?? 24 : sick?.defaultDays ?? 7} Days Available</span>
        <span className="text-[12.5px] text-muted">Organization policy · {activeType === 'Paid Time Off' ? 'paid' : 'sick'} leave for the year</span>
      </div>

      <CalendarMonth
        month={month}
        onPrev={() => setMonth((m) => subMonths(m, 1))}
        onNext={() => setMonth((m) => addMonths(m, 1))}
        requests={reqQ.data ?? []}
        onPick={(date) => { setDraftDate(date); setApplyOpen(true); }}
      />

      <div className="crew-card">
        <h2 className="crew-label-track mb-2">My requests</h2>
        {myRequests.length === 0 ? (
          <EmptyState icon={<CalendarDays size={20} />} title="No time-off requests yet" hint="Apply for paid, sick, or unpaid leave using the Apply button." />
        ) : (
          <ul className="crew-activity">
            {myRequests.map((r) => (
              <RequestRow key={r.id} request={r} />
            ))}
          </ul>
        )}
      </div>

      {applyOpen && (
        <TimeOffRequestModal
          open={applyOpen}
          onClose={() => setApplyOpen(false)}
          defaultDate={draftDate}
        />
      )}
        </div>
  );
}

function CalendarMonth({ month, onPrev, onNext, requests, onPick }: { month: Date; onPrev: () => void; onNext: () => void; requests: TimeOffRequest[]; onPick: (date: string) => void }) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const start = startOfMonth(first);
  const leadPad = (start.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const today = format(new Date(), 'yyyy-MM-dd');

  const cells: (string | null)[] = [
    ...Array.from({ length: leadPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => format(new Date(year, m, i + 1), 'yyyy-MM-dd')),
  ];

  return (
    <div className="crew-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="crew-label-track flex items-center gap-2"><CalendarDays size={14} /> {format(first, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-line bg-cloud px-1 py-1">
          <button onClick={onPrev} aria-label="Previous month" className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-muted hover:bg-[var(--color-section)] crew-focusable">‹</button>
          <button onClick={onNext} aria-label="Next month" className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-muted hover:bg-[var(--color-section)] crew-focusable">›</button>
        </div>
      </div>
      <div className="crew-cal">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <span key={d} className="crew-cal__head">{d}</span>
        ))}
        {cells.map((date, idx) => {
          if (!date) return <span key={`pad-${idx}`} />;
          const covering = requests.filter((r) => date >= r.startDate && date <= r.endDate);
          const tags = covering.slice(0, 3).map((r) => {
            const isPending = r.status === 'pending';
            const cls = isPending ? 'crew-cal__chip--pending' : r.type === 'Paid Time Off' ? 'crew-cal__chip--pto' : r.type === 'Sick Leave' ? 'crew-cal__chip--sick' : 'crew-cal__chip--unpaid';
            const label = isPending ? 'Pending' : r.type === 'Paid Time Off' ? 'PTO' : r.type === 'Sick Leave' ? 'Sick' : 'Unpaid';
            return { cls, label, key: r.id };
          });
          const isToday = date === today;
          return (
            <button
              key={date}
              className={`crew-cal__d ${isToday ? 'crew-cal__d--today' : ''}`}
              onClick={() => onPick(date)}
            >
              <span className="crew-cal__num">{Number(date.slice(8, 10))}</span>
              {tags.map((t) => (
                <span key={t.key} className={`crew-cal__chip ${t.cls}`}>{t.label}</span>
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function subMonths(d: Date, n: number): Date { return new Date(d.getFullYear(), d.getMonth() - n, 1); }
function addMonths(d: Date, n: number): Date { return new Date(d.getFullYear(), d.getMonth() + n, 1); }

function RequestRow({ request }: { request: TimeOffRequest }) {
  return (
    <li>
      <span className="crew-activity__icon">{request.type === 'Paid Time Off' ? '🗓' : request.type === 'Sick Leave' ? '🩺' : '—'}</span>
      <span className="flex-1">
        <span className="block crew-activity__title">{request.type} · {request.days} day{request.days > 1 ? 's' : ''}</span>
        <span className="crew-activity__meta">{fmtDate(request.startDate)} → {fmtDate(request.endDate)}</span>
        {request.remarks && <span className="mt-1 block rounded-[var(--radius-sm)] bg-[var(--color-section)] px-2 py-1 text-[12px] text-muted">{request.remarks}</span>}
        {request.decisionComment && <span className="mt-1 block text-[12px] text-muted">HR: “{request.decisionComment}”</span>}
      </span>
      <StatusBadge status={request.status} />
    </li>
  );
}