import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Save, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import { QK } from '@/lib/queryKeys';
import { fmtDate } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input, Field, TextArea } from '@/components/ui/Inputs';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge, EmptyState } from '@/components/ui/Feedback';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useToasts } from '@/lib/store';
import type { Employee, TimeOffRequest } from '@/types';

/**
 * §8.1 — Admin/HR Time Off. Sub-tabs: Time Off | Allocation.
 * Approval/Rejection is admin-only and applies to Pending rows —
 * with an optional decision comment (§8.4).
 */
export function AdminTimeOff() {
  const [section, setSection] = useState('time');
  const [sub, setSub] = useState<'pto' | 'sick'>('pto');
  const [query, setQuery] = useState('');

  const reqQ = useQuery({ queryKey: QK.timeOff(), queryFn: () => api.getTimeOff() });
  const empQ = useQuery({ queryKey: QK.employees, queryFn: () => api.getEmployees() });
  const allocQ = useQuery({ queryKey: QK.allocations, queryFn: () => api.getAllocations() });

  const byId = useMemo(() => {
    const map = new Map<string, Employee>();
    (empQ.data ?? []).forEach((e) => map.set(e.id, e));
    return map;
  }, [empQ.data]);

  const all = reqQ.data ?? [];
  const q = query.trim().toLowerCase();
  const filtered = q
    ? all.filter((r) => {
        const emp = byId.get(r.employeeId);
        return `${emp?.firstName ?? ''} ${emp?.lastName ?? ''} ${r.type}`.toLowerCase().includes(q);
      })
    : all.filter((r) => (sub === 'pto' ? r.type === 'Paid Time Off' : r.type === 'Sick Leave' || r.type === 'Unpaid Leave'));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Time Off</h1>
        <p className="text-[13px] text-muted">Review & approve team leave · policy balances under Allocation</p>
      </div>

      <Tabs
        items={[
          { id: 'time', label: 'Time Off' },
          { id: 'allocation', label: 'Allocation' },
        ]}
        active={section}
        onChange={setSection}
      />

      {section === 'time' ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              items={[
                { id: 'pto', label: 'Paid Time Off' },
                { id: 'sick', label: 'Sick Time Off' },
              ]}
              active={sub}
              onChange={(id) => setSub(id as 'pto' | 'sick')}
            />
            <span className="crew-badge crew-badge--info">
              {sub === 'pto' ? `${allocQ.data?.find((a) => a.type === 'Paid Time Off')?.defaultDays ?? 24} days available` : `${allocQ.data?.find((a) => a.type === 'Sick Leave')?.defaultDays ?? 7} days available`}
            </span>
          </div>
          <div className="relative max-w-sm">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <Input placeholder="Search by employee or type…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" aria-label="Search time off" />
          </div>
          {reqQ.isLoading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : filtered.length === 0 ? (
            <div className="crew-card">
              <EmptyState icon={<Search size={20} />} title="No requests match" hint="Nothing here yet — new requests from employees appear instantly." />
            </div>
          ) : (
            <RequestsTable rows={filtered} employees={byId} />
          )}
        </>
      ) : (
        <AllocationPanel />
      )}
    </div>
  );
}
function RequestsTable({ rows, employees }: { rows: TimeOffRequest[]; employees: Map<string, Employee> }) {
  const [decision, setDecision] = useState<{ req: TimeOffRequest; action: 'approved' | 'rejected' } | null>(null);
  const [comment, setComment] = useState('');
  const qc = useQueryClient();
  const toast = useToasts((s) => s.toast);

  const decide = useMutation({
    mutationFn: () => api.decideTimeOff(decision!.req.id, decision!.action, comment),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: QK.timeOff() });
      const prev = qc.getQueryData<TimeOffRequest[]>(QK.timeOff());
      qc.setQueryData<TimeOffRequest[]>(QK.timeOff(), (old) =>
        (old ?? []).map((r) => (r.id === decision!.req.id ? { ...r, status: decision!.action, decisionComment: comment } : r)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(QK.timeOff(), ctx.prev);
      toast('error', 'Could not update the request. Please retry.');
    },
    onSuccess: () => {
      toast('success', `Request ${decision!.action === 'approved' ? 'approved' : 'rejected'}.`);
      qc.invalidateQueries({ queryKey: QK.timeOff() });
      qc.invalidateQueries({ queryKey: QK.timeOff(decision!.req.employeeId) });
      qc.invalidateQueries({ queryKey: QK.activities });
      setDecision(null);
      setComment('');
    },
  });

  return (
    <>
      <div className="crew-table-wrap">
        <table className="crew-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Time Off Type</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const emp = employees.get(r.employeeId);
              return (
                <tr key={r.id}>
                  <td>
                    <span className="flex items-center gap-2.5">
                      <Avatar name={`${emp?.firstName ?? ''} ${emp?.lastName ?? ''}`} photo={emp?.photo} color={emp?.avatarColor} size={30} />
                      <span className="font-medium">{emp?.firstName} {emp?.lastName}</span>
                    </span>
                  </td>
                  <td>{fmtDate(r.startDate)}</td>
                  <td>{fmtDate(r.endDate)}</td>
                  <td>{r.type} · {r.days}d</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-right">
                    {r.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setDecision({ req: r, action: 'rejected' })}
                          aria-label={`Reject ${emp?.firstName}’s request`}
                          title="Reject"
                          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-danger transition hover:bg-[var(--color-danger-soft)] crew-focusable"
                        >
                          <X size={16} />
                        </button>
                        <button
                          onClick={() => setDecision({ req: r, action: 'approved' })}
                          aria-label={`Approve ${emp?.firstName}’s request`}
                          title="Approve"
                          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-success transition hover:bg-[var(--color-success-soft)] crew-focusable"
                        >
                          <Check size={16} />
                        </button>
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-muted">No requests.</td></tr>}
          </tbody>
        </table>
      </div>

      {decision && (
        <Modal
          open
          title={decision.action === 'approved' ? 'Approve time off' : 'Reject time off'}
          onClose={() => setDecision(null)}
          closeOnBackdrop={!decide.isPending}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDecision(null)} disabled={decide.isPending}>Cancel</Button>
              {decision.action === 'approved' ? (
                <Button variant="success" onClick={() => decide.mutate()} loading={decide.isPending}><Check size={15} /> Approve</Button>
              ) : (
                <Button variant="danger-solid" onClick={() => decide.mutate()} loading={decide.isPending}><X size={15} /> Reject</Button>
              )}
            </>
          }
        >
          <Field label="Decision comment (optional)" hint="The employee sees this note in their Time Off view.">
            <TextArea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="e.g. Enjoy your time off!" />
          </Field>
        </Modal>
      )}
    </>
  );
}

/** §8.1 Allocation sub-tab — company-wide leave-day policy. */
function AllocationPanel() {
  const allocQ = useQuery({ queryKey: QK.allocations, queryFn: () => api.getAllocations() });
  const qc = useQueryClient();
  const toast = useToasts((s) => s.toast);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDays, setEditDays] = useState(0);

  const updateDays = (type: string, days: number) => {
    api.updateAllocation(type, days)
      .then(() => {
        qc.invalidateQueries({ queryKey: QK.allocations });
        toast('success', `${type} allocation updated.`);
      })
      .catch(() => toast('error', 'Could not update allocation.'));
  };

  if (allocQ.isLoading) return <TableSkeleton rows={4} cols={3} />;

  const rows = allocQ.data ?? [];

  return (
    <div className="crew-card">
      <h2 className="crew-label-track mb-4">Leave Allocation Policy</h2>
      <p className="text-[13px] text-muted mb-4">Default days allotted per employee per year. Edit the Days column to change the company-wide policy.</p>
      <div className="crew-table-wrap">
        <table className="crew-table">
          <thead>
            <tr>
              <th>Leave Type</th>
              <th>Unit</th>
              <th className="crew-table--num">Default Days / Year</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const isEditing = editingId === a.type;
              return (
                <tr key={a.type}>
                  <td className="font-medium">{a.type}</td>
                  <td className="text-muted">{a.unit}</td>
                  <td className="crew-table--num">
                    {isEditing ? (
                      <input
                        type="number"
                        min={0}
                        value={editDays}
                        onChange={(e) => setEditDays(Number(e.target.value))}
                        className="crew-input w-20"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { updateDays(a.type, editDays); setEditingId(null); }
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      String(a.defaultDays)
                    )}
                  </td>
                  <td className="text-right">
                    {isEditing ? (
                      <>
                        <Button size="sm" variant="success" onClick={() => { updateDays(a.type, editDays); setEditingId(null); }}>
                          <Save size={13} /> Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => { setEditDays(a.defaultDays); setEditingId(a.type); }}>
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-muted">No allocation policies defined.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}