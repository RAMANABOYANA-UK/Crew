import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Users } from 'lucide-react';
import { useSession } from '@/lib/store';
import { api } from '@/lib/api';
import { QK } from '@/lib/queryKeys';
import { fmtMoney } from '@/lib/utils';
import { computeSalary, defaultBreakdownRows } from '@/lib/salary';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/Feedback';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { Employee, SalaryBreakdown } from '@/types';

/** §9 — Payroll / Analytics. */
export function PayrollPage() {
  const { role } = useSession();
  const isAdmin = role === 'admin';
    return isAdmin ? <AdminPayroll /> : <EmployeePayroll />;
}

// ------------------------------------------------------------------
// Employee view — own payslip
// ------------------------------------------------------------------
function EmployeePayroll() {
  const { user } = useSession();
  const payslipsQ = useQuery({ queryKey: QK.payslips(user!.id), queryFn: () => api.getPayslips(user!.id) });

  if (payslipsQ.isLoading) return <Skeleton className="h-96 w-full" />;

  const slips = payslipsQ.data ?? [];
  const latest = slips[0];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">My Payroll</h1>

      {latest && <PayslipCard slip={latest} />}

      <div className="crew-card">
        <h2 className="crew-label-track mb-3">Salary Slips</h2>
        {slips.length === 0 ? (
          <EmptyState icon={<FileText size={20} />} title="No salary slips yet" hint="Your payslips will appear here once payroll is processed." />
        ) : (
          <div className="crew-table-wrap">
            <table className="crew-table">
              <thead><tr><th>Month</th><th className="crew-table--num">Gross</th><th className="crew-table--num">Net Pay</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {slips.map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.month}</td>
                    <td className="crew-table--num">{fmtMoney(s.computed.grossMonthly)}</td>
                    <td className="crew-table--num">{fmtMoney(s.computed.netMonthly)}</td>
                    <td className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => {}} disabled><Download size={14} /> Download</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

interface PayslipProps {
  slip: { id: string; month: string; computed: SalaryBreakdown };
}

function PayslipCard({ slip }: PayslipProps) {
  const c = slip.computed;
  return (
    <div className="crew-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Salary Slip — {slip.month}</h2>
        <Button size="sm" variant="secondary" disabled><Download size={14} /> Download PDF</Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReadOnly label="Gross monthly" figure={fmtMoney(c.grossMonthly)} />
        <ReadOnly label="PF (employee)" figure={fmtMoney(c.pfEmployee)} />
        <ReadOnly label="Professional tax" figure={fmtMoney(c.professionalTax)} />
        <ReadOnly label="Net pay (monthly)" figure={fmtMoney(c.netMonthly)} />
      </div>
      <div className="mt-4">
        <h3 className="crew-label mb-2">Components</h3>
        <div className="crew-table-wrap">
          <table className="crew-table">
            <thead><tr><th>Component</th><th className="crew-table--num">Amount (₹ / month)</th></tr></thead>
            <tbody>
              {c.rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.label}</td>
                  <td className="crew-table--num">{fmtMoney(r.fixedAmount)}</td>
                </tr>
              ))}
              <tr>
                <td className="font-semibold">Net pay</td>
                <td className="crew-table--num font-bold">{fmtMoney(c.netMonthly)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReadOnly({ label, figure }: { label: string; figure: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-canvas px-3 py-2.5">
      <p className="crew-label">{label}</p>
      <p className="mt-0.5 text-[15px] font-semibold text-ink">{figure}</p>
    </div>
  );
}

// ------------------------------------------------------------------
// Admin view — employee payroll + analytics & reports
// ------------------------------------------------------------------
function AdminPayroll() {
  const empQ = useQuery({ queryKey: QK.employees, queryFn: () => api.getEmployees() });
  const reportQ = useQuery({ queryKey: QK.report, queryFn: () => api.getReport() });
  const [selectedId, setSelectedId] = useState<string>('');

  const employees = empQ.data ?? [];
  const target = selectedId ? employees.find((e) => e.id === selectedId) : employees[0];
  const report = reportQ.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payroll &amp; Analytics</h1>
          <p className="text-[13px] text-muted">Salary overview per employee · org-wide reports below</p>
        </div>
        <div className="relative max-w-xs">
          <Users size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <select
            aria-label="Select employee"
            className="crew-input pl-9"
            value={selectedId || target?.id || ''}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
            ))}
          </select>
        </div>
      </div>

      {target && <SalarySummaryCard employee={target} />}

      {reportQ.isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : report ? (
        <ReportsDashboard report={report} />
      ) : (
        <EmptyState icon={<FileText size={20} />} title="No report data yet" hint="Reports appear once there is attendance and leave activity." />
      )}
    </div>
  );
}

interface ReportData {
  attendanceTrend: { day: string; present: number; absent: number }[];
  leaveBalance: { type: string; used: number; total: number }[];
  payrollByDept: { dept: string; total: number }[];
}

function SalarySummaryCard({ employee }: { employee: Employee }) {
  const ratesQ = useQuery({ queryKey: QK.salaryRates(employee.id), queryFn: () => api.getSalaryRates(employee.id) });

  if (ratesQ.isLoading) return <Skeleton className="h-40 w-full" />;
  const rates = ratesQ.data!;
  const calc = computeSalary(employee.fixedWage, defaultBreakdownRows(rates), rates.pfEmployeePct, rates.pfEmployerPct, rates.professionalTax);

  return (
    <div className="crew-card">
      <div className="mb-3 flex items-center gap-3">
        <Avatar name={`${employee.firstName} ${employee.lastName}`} photo={employee.photo} color={employee.avatarColor} size={44} />
        <div>
          <p className="font-semibold">{employee.firstName} {employee.lastName}</p>
          <p className="text-[12.5px] text-muted">{employee.designation} · {employee.department} · <span className="crew-mono">{employee.loginId}</span></p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ReadOnly label="Monthly wage" figure={fmtMoney(employee.fixedWage)} />
        <ReadOnly label="Gross components" figure={fmtMoney(calc.grossMonthly)} />
        <ReadOnly label="Deductions" figure={fmtMoney(calc.monthlyDeductions)} />
        <ReadOnly label="Net pay (monthly)" figure={fmtMoney(calc.netMonthly)} />
      </div>
    </div>
  );
}

function ReportsDashboard({ report }: { report: ReportData }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="crew-card">
        <h2 className="crew-label-track mb-3">Attendance trend (last 14 days)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={report.attendanceTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
            <XAxis dataKey="day" stroke="var(--color-ink-faint)" fontSize={12} />
            <YAxis stroke="var(--color-ink-faint)" fontSize={12} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="present" name="Present" stroke="var(--color-success)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="absent" name="Absent" stroke="var(--color-danger)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="crew-card">
        <h2 className="crew-label-track mb-3">Monthly wage by department</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={report.payrollByDept}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
            <XAxis dataKey="dept" stroke="var(--color-ink-faint)" fontSize={11} />
            <YAxis stroke="var(--color-ink-faint)" fontSize={12} />
            <Tooltip />
            <Bar dataKey="total" name="Total wage (₹)" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="crew-card lg:col-span-2">
        <h2 className="crew-label-track mb-3">Leave balance overview</h2>
        <div className="crew-table-wrap">
          <table className="crew-table">
            <thead><tr><th>Leave Type</th><th className="crew-table--num">Used</th><th className="crew-table--num">Total</th><th className="crew-table--num">Remaining</th></tr></thead>
            <tbody>
              {report.leaveBalance.map((lb) => (
                <tr key={lb.type}>
                  <td className="font-medium">{lb.type}</td>
                  <td className="crew-table--num">{lb.used}</td>
                  <td className="crew-table--num">{lb.total}</td>
                  <td className="crew-table--num">{Math.max(0, lb.total - lb.used)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

