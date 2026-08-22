import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, List, Plus, Search, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { QK } from '@/lib/queryKeys';
import { todayISO } from '@/lib/utils';
import { resolveEmployeeStatus } from '@/lib/status';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Inputs';
import { Segmented } from '@/components/ui/Tabs';
import { EmployeeStatusIndicator, EmptyState } from '@/components/ui/Feedback';
import { GridSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { AddEmployeeModal } from './AddEmployeeModal';
import type { Employee } from '@/types';
import type { EmployeeTodayStatus } from '@/lib/status';

type Status = EmployeeTodayStatus;

export function EmployeeDirectory() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const navigate = useNavigate();
  const today = todayISO();

  const employeesQ = useQuery({ queryKey: QK.employees, queryFn: () => api.getEmployees() });
  const attendanceQ = useQuery({ queryKey: QK.attendance(undefined, today, today), queryFn: () => api.getAttendance({ from: today, to: today }) });
  const timeOffQ = useQuery({ queryKey: QK.timeOff(), queryFn: () => api.getTimeOff() });

  const rows = useMemo(() => {
    const emps = employeesQ.data ?? [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? emps.filter(
          (e) =>
            e.firstName.toLowerCase().includes(q) ||
            e.lastName.toLowerCase().includes(q) ||
            `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
            e.loginId.toLowerCase().includes(q) ||
            e.department.toLowerCase().includes(q) ||
            e.designation.toLowerCase().includes(q),
        )
      : emps;
    return filtered.map((emp) => {
      const todayRec = attendanceQ.data?.find((r) => r.employeeId === emp.id);
      const status = resolveEmployeeStatus(todayRec, timeOffQ.data ?? [], today);
      return { emp, status };
    });
  }, [employeesQ.data, attendanceQ.data, timeOffQ.data, query, today]);

  const isLoading = employeesQ.isLoading || attendanceQ.isLoading || timeOffQ.isLoading;

  return (
    <div className="flex flex-col gap-5">
      {/* page head */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-[13px] text-muted">
            {employeesQ.data?.length ?? 0} people · {today} · status reflects right now
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={15} /> New
        </Button>
      </div>

      {/* toolbar: search + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <Input
            aria-label="Search employees"
            placeholder="Search by name, login ID, department…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="ml-auto">
          <Segmented
            options={[
              { value: 'grid', label: <LayoutGrid size={15} aria-label="Grid view" /> },
              { value: 'list', label: <List size={15} aria-label="List view" /> },
            ]}
            value={view}
            onChange={setView}
            ariaLabel="View mode"
          />
        </div>
      </div>

      {/* content */}
      {isLoading ? (
        view === 'grid' ? <GridSkeleton count={6} /> : <TableSkeleton rows={6} cols={6} />
      ) : rows.length === 0 ? (
        <div className="crew-card">
          <EmptyState
            icon={<Users size={20} />}
            title={query ? 'No employees match your search' : 'No employees yet'}
            hint={query ? 'Try a different name, ID, or department.' : 'Add your first employee to get started.'}
            action={!query ? <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Employee</Button> : undefined}
          />
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ emp, status }) => (
            <EmpCard key={emp.id} emp={emp} status={status} onClick={() => navigate(`/employees/${emp.id}`)} />
          ))}
        </div>
      ) : (
        <EmpList rows={rows} onClick={(id) => navigate(`/employees/${id}`)} />
      )}

      {addOpen && <AddEmployeeModal onClose={() => setAddOpen(false)} />}
    </div>
  );
}
function EmpCard({ emp, status, onClick }: { emp: Employee; status: Status; onClick: () => void }) {
  return (
    <button className="crew-emp-card" onClick={onClick} aria-label={`Open profile of ${emp.firstName} ${emp.lastName}`}>
      <span className="absolute right-3 top-3">
        <EmployeeStatusIndicator state={status} />
      </span>
      <div className="flex items-center gap-3">
        <Avatar name={`${emp.firstName} ${emp.lastName}`} photo={emp.photo} color={emp.avatarColor} size={46} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{emp.firstName} {emp.lastName}</p>
          <p className="truncate text-[13px] text-muted">{emp.designation}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="crew-badge crew-badge--neutral">{emp.department}</span>
        <span className="crew-mono crew-badge crew-badge--neutral" style={{ fontFamily: 'var(--font-mono)' }}>{emp.loginId}</span>
      </div>
    </button>
  );
}

function EmpList({ rows, onClick }: { rows: { emp: Employee; status: Status }[]; onClick: (id: string) => void }) {
  return (
    <div className="crew-table-wrap">
      <table className="crew-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Login ID</th>
            <th>Department</th>
            <th>Role</th>
            <th>Today</th>
            <th className="crew-table--num">Wage (₹/mo)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ emp, status }) => (
            <tr key={emp.id} onClick={() => onClick(emp.id)} className="cursor-pointer">
              <td>
                <div className="flex items-center gap-2.5">
                  <Avatar name={`${emp.firstName} ${emp.lastName}`} photo={emp.photo} color={emp.avatarColor} size={30} />
                  <span className="font-semibold">{emp.firstName} {emp.lastName}</span>
                </div>
              </td>
              <td className="crew-mono text-muted">{emp.loginId}</td>
              <td>{emp.department}</td>
              <td className="text-muted">{emp.designation}</td>
              <td><EmployeeStatusIndicator state={status} /></td>
              <td className="crew-table--num">{Number(emp.fixedWage).toLocaleString('en-IN')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}