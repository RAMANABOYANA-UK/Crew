import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { QK } from '@/lib/queryKeys';
import { useSession } from '@/lib/store';
import { fmtDate } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { ResumeTab } from './ResumeTab';
import { PrivateInfoTab } from './PrivateInfoTab';
import { SalaryTab } from './SalaryInfoTab';
import { SecurityTab } from './SecurityTab';
import type { Employee } from '@/types';

/**
 * §6 — one Profile component that adapts by role + ownership:
 *  - own profile (avatar menu) → editable, full tab set incl. Security
 *  - admin viewing another employee → view-only, Salary tab, no Security
 *  - employee own → Resume | Private Info | Salary (read-only) | Security
 */
export function ProfilePage() {
  const { user: me, role } = useSession();
  const navigate = useNavigate();
  const { id } = useParams();
  const isOwn = !id || id === me?.id;
  const employeeId = isOwn ? me!.id : (id as string);

  const empQ = useQuery({ queryKey: QK.employee(employeeId), queryFn: () => api.getEmployee(employeeId) });
  const employeesQ = useQuery({ queryKey: QK.employees, queryFn: () => api.getEmployees() });

  const employee = empQ.data ?? undefined;
  const manager = employee?.managerId
    ? (employeesQ.data ?? []).find((m) => m.id === employee.managerId)
    : undefined;

  const readOnly = !isOwn; // admin browsing another employee
  const salaryEditable = role === 'admin';
  const [tab, setTab] = useState('resume');

  const items = useMemo(() => {
    if (readOnly) {
      return [
        { id: 'resume', label: 'Resume' },
        { id: 'private', label: 'Private Info' },
        { id: 'salary', label: 'Salary Info' },
      ];
    }
    return [
      { id: 'resume', label: 'Resume' },
      { id: 'private', label: 'Private Info' },
      { id: 'salary', label: 'Salary Info' },
      { id: 'security', label: 'Security' },
    ];
  }, [readOnly]);

  if (empQ.isLoading) return <ProfileLoading />;
  if (empQ.isError || !employee) {
    return (
      <div className="crew-card flex flex-col items-center gap-2 py-14 text-center">
        <p className="text-sm font-semibold">Could not load this profile.</p>
        <button className="text-sm font-medium text-accent hover:underline" onClick={() => navigate('/employees')}>← Back to employees</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {!isOwn && (
        <button onClick={() => navigate('/employees')} className="self-start text-[13px] font-medium text-muted hover:text-ink">← Back to Employees</button>
      )}
      <ProfileHeader employee={employee} managerName={manager ? `${manager.firstName} ${manager.lastName}` : undefined} readOnly={readOnly} />

      <Tabs items={items} active={tab} onChange={setTab} />

      <div className="pt-1">
        {tab === 'resume' && <ResumeTab employee={employee} readOnly={readOnly} />}
        {tab === 'private' && <PrivateInfoTab employee={employee} readOnly={readOnly} />}
        {tab === 'salary' && <SalaryTab employee={employee} editable={salaryEditable} />}
        {tab === 'security' && <SecurityTab />}
      </div>
    </div>
  );
}
// ------------------------------------------------------------------
// §6.3 — common profile header (all views)
// ------------------------------------------------------------------
function ProfileHeader({
  employee,
  managerName,
  readOnly,
}: {
  employee: Employee;
  managerName: string | undefined;
  readOnly: boolean;
}) {
  return (
    <div className="crew-card flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-center gap-4">
        <Avatar name={`${employee.firstName} ${employee.lastName}`} photo={employee.photo} color={employee.avatarColor} size={64} />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{employee.firstName} {employee.lastName}</h1>
            {readOnly && <span className="crew-badge crew-badge--neutral">View only</span>}
          </div>
          <p className="text-[13px] text-muted">{employee.designation} · {employee.department}</p>
          <p className="crew-mono mt-0.5 text-xs text-muted">{employee.loginId}</p>
        </div>
      </div>
      <dl className="flex flex-wrap gap-x-8 gap-y-2 sm:justify-items-end">
        <HeaderKV label="Company" value={useSession.getState().company?.name ?? '—'} />
        <HeaderKV label="Joining date" value={fmtDate(employee.dateOfJoining)} />
        {managerName && <HeaderKV label="Manager" value={managerName} />}
        <HeaderKV label="Mobile" value={employee.phone} />
        <HeaderKV label="Working days / week" value={`${employee.workingDaysPerWeek}`} />
      </dl>
    </div>
  );
}

function HeaderKV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="crew-label">{label}</dt>
      <dd className="mt-0.5 text-[13px] font-medium">{value}</dd>
    </div>
  );
}

function ProfileLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="crew-card flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <div className="flex gap-4 border-b border-line pb-1">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}