import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { KeyRound, Info, Users, Camera, ArrowLeft } from 'lucide-react';
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

export function ProfilePage() {
  const { user: me, role } = useSession();
  const navigate = useNavigate();
  const { id } = useParams();
  const isOwn = !id || id === me?.id || role === 'employee';
  const employeeId = (role === 'employee' || !id) ? me!.id : (id as string);

  const empQ = useQuery({ queryKey: QK.employee(employeeId), queryFn: () => api.getEmployee(employeeId) });
  const employeesQ = useQuery({ queryKey: QK.employees, queryFn: () => api.getEmployees() });

  const employee = empQ.data ?? undefined;
  const manager = employee?.managerId
    ? (employeesQ.data ?? []).find((m) => m.id === employee.managerId)
    : undefined;

  const readOnly = !isOwn;
  const salaryEditable = role === 'admin';
  const [tab, setTab] = useState('private');

  const items = useMemo(() => {
    if (readOnly) {
      return [
        { id: 'private', label: 'Personal Info' },
        { id: 'resume', label: 'Resume & Experience' },
        { id: 'salary', label: 'Salary Info' },
      ];
    }
    return [
      { id: 'private', label: 'Personal Info' },
      { id: 'resume', label: 'Resume & Experience' },
      { id: 'salary', label: 'Salary Info' },
      { id: 'security', label: 'Security' },
    ];
  }, [readOnly]);

  if (empQ.isLoading) return <ProfileLoading />;
  if (empQ.isError || !employee) {
    return (
      <div className="rounded-lg border border-[#e2e8f0] bg-white p-12 text-center">
        <p className="text-sm font-semibold text-red-600">Could not load this profile.</p>
        <button className="mt-2 text-xs font-medium text-[#0284c7] hover:underline" onClick={() => navigate('/employees')}>
          ← Back to employees
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!isOwn && (
        <button onClick={() => navigate('/employees')} className="flex items-center gap-1.5 self-start text-xs font-semibold text-[#475569] hover:text-[#0f172a]">
          <ArrowLeft size={14} /> Back to Employees
        </button>
      )}

      {/* ---------------- 1. Top Summary Identity Card (Portal Layout) ---------------- */}
      <div className="rounded-lg border border-[#e2e8f0] bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          {/* Large Square Photo Container */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="relative h-44 w-36 overflow-hidden rounded-md border-2 border-[#cbd5e1] bg-[#f8fafc] shadow-xs">
              {employee.photo ? (
                <img src={employee.photo} alt={`${employee.firstName} ${employee.lastName}`} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-4xl font-bold text-white"
                  style={{ backgroundColor: employee.avatarColor || '#6d4aff' }}
                >
                  {employee.firstName.slice(0, 1)}
                  {employee.lastName.slice(0, 1)}
                </div>
              )}
            </div>
          </div>

          {/* Structured Key-Value Metadata */}
          <div className="flex-1">
            <h1 className="text-base font-bold uppercase tracking-wide text-[#0f172a] mb-2.5">
              {employee.firstName} {employee.lastName}
            </h1>

            <div className="grid grid-cols-1 gap-x-6 gap-y-0.5 md:grid-cols-2">
              <PortalKV label="Employment Status" value={<span className="font-bold text-[#16a34a]">Active · Full-Time</span>} />
              <PortalKV label="Employee ID" value={employee.loginId} />
              <PortalKV label="Work Email" value={employee.email} />
              <PortalKV label="Phone Number" value={employee.phone} />
              <PortalKV label="Business Division" value={employee.department.includes('Engineering') || employee.department.includes('Design') ? 'Product & Technology' : 'Operations & Business'} />
              <PortalKV label="Department" value={employee.department} />
              <PortalKV label="Job Title / Role" value={employee.designation} />
              <PortalKV label="Reporting Manager" value={manager ? `${manager.firstName} ${manager.lastName} (${manager.designation})` : 'Executive Management'} />
              <PortalKV label="Company / Employer" value={useSession.getState().company?.name ?? 'Crewline Technologies'} />
              <PortalKV label="Employment Type" value="Permanent Full-Time" />
              <PortalKV label="Date of Joining" value={fmtDate(employee.dateOfJoining)} />
              <PortalKV label="Work Location" value="Corporate HQ (Mumbai, IN)" />
              <PortalKV label="Work Schedule" value={`${employee.workingDaysPerWeek} Days / Week (${employee.basicHoursPerDay} hrs/day)`} />
              <PortalKV label="Wage Model" value={employee.wageType === 'fixed' ? 'Fixed Monthly CTC' : 'Hourly Rate Model'} />
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- 2. Sub-Card: Profile Details ---------------- */}
      <div className="rounded-lg border border-[#e2e8f0] bg-white shadow-xs">
        {/* Header Bar with Action Buttons */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#e2e8f0] px-5 py-3 gap-2">
          <h2 className="text-sm font-bold text-[#0f172a]">Employee Profile & Records</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('security')}
              className="portal-btn-action"
            >
              <KeyRound size={12} className="text-[#0284c7]" /> Change Password
            </button>
            <button
              onClick={() => setTab('resume')}
              className="portal-btn-action"
            >
              <Info size={12} className="text-[#0284c7]" /> Resume & Skills
            </button>
            <button
              onClick={() => setTab('private')}
              className="portal-btn-action"
            >
              <Users size={12} className="text-[#0284c7]" /> Personal Info
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-[#f1f5f9]">
          <Tabs items={items} active={tab} onChange={setTab} />
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {tab === 'private' && <PrivateInfoTab employee={employee} readOnly={readOnly} />}
          {tab === 'resume' && <ResumeTab employee={employee} readOnly={readOnly} />}
          {tab === 'salary' && <SalaryTab employee={employee} editable={salaryEditable} />}
          {tab === 'security' && <SecurityTab />}
        </div>
      </div>
    </div>
  );
}

function PortalKV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="portal-table-row">
      <span className="portal-table-label">{label}</span>
      <span className="portal-table-colon">:</span>
      <span className="portal-table-value">{value}</span>
    </div>
  );
}

function ProfileLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-[#e2e8f0] bg-white p-5">
        <div className="flex gap-6">
          <Skeleton className="h-44 w-36 rounded-md" />
          <div className="flex flex-1 flex-col gap-2.5">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-full max-w-lg" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
        </div>
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}