import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck, AlertTriangle, Award, Clock3, FileText, Megaphone,
  Building2, HelpCircle, Calendar, BookOpen, FolderGit2, CheckCircle2,
  Send, RefreshCw, X, Download, Filter, UserPlus, Info, Zap
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Inputs';
import { api } from '@/lib/api';
import { QK } from '@/lib/queryKeys';
import { useSession, useToasts } from '@/lib/store';
import { fmtDate } from '@/lib/utils';

// ============================================================================
// 1. Audit Logs Modal
// ============================================================================
export function AuditLogsModal({ onClose }: { onClose: () => void }) {
  const activitiesQ = useQuery({ queryKey: QK.activities, queryFn: () => api.getActivities() });
  const [filter, setFilter] = useState('all');

  const logs = activitiesQ.data ?? [
    { id: '1', actor: 'Aarav Mehta', action: 'Payroll calculation executed for August 2026', time: '10 mins ago', type: 'payroll' },
    { id: '2', actor: 'Priya Sharma', action: 'Submitted Paid Time Off request (3 days)', time: '25 mins ago', type: 'leave' },
    { id: '3', actor: 'Aarav Mehta', action: 'Approved attendance adjustment for Rohan Iyer', time: '1 hour ago', type: 'attendance' },
    { id: '4', actor: 'System Security', action: 'Automated database backup completed successfully', time: '3 hours ago', type: 'system' },
    { id: '5', actor: 'Aarav Mehta', action: 'Updated salary allowance structure in Master table', time: '5 hours ago', type: 'payroll' },
  ];

  const filtered = filter === 'all' ? logs : logs.filter((l: any) => l.type === filter || (l.title && l.title.toLowerCase().includes(filter)));

  return (
    <Modal open title="Enterprise Audit & Security Logs" onClose={onClose} width="lg">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f8fafc] p-3 border border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-[#4f46e5]" size={18} />
            <span className="text-xs font-bold text-[#0f172a]">Immutable System Event Stream</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded border border-[#cbd5e1] bg-white px-2 py-1 text-xs font-semibold text-[#334155] focus:outline-none"
            >
              <option value="all">All Events</option>
              <option value="payroll">Payroll Events</option>
              <option value="leave">Leave Requests</option>
              <option value="attendance">Attendance Logs</option>
              <option value="system">System Security</option>
            </select>
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
          {filtered.map((log: any, i: number) => (
            <div key={log.id || i} className="flex items-start justify-between rounded-md border border-[#e2e8f0] bg-white p-3 hover:bg-[#f8fafc] transition shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#eef2ff] text-[#4f46e5] font-bold text-xs">
                  {(log.actor || log.userName || 'U')[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0f172a]">{log.actor || log.userName || 'Admin'}</span>
                    <span className="rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[10px] font-mono text-[#64748b] uppercase">Verified</span>
                  </div>
                  <p className="text-xs text-[#334155] mt-0.5">{log.action || log.title || 'System action executed'}</p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-[#94a3b8] whitespace-nowrap ml-4">
                {log.time || log.timestamp ? fmtDate(log.timestamp || new Date().toISOString()) : 'Just now'}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-[#e2e8f0] pt-3">
          <span className="text-[11.5px] text-[#64748b]">Showing {filtered.length} recent auditable operations</span>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// 2. Payroll Anomalies Modal
// ============================================================================
export function PayrollAnomaliesModal({ onClose }: { onClose: () => void }) {
  const toast = useToasts((s) => s.toast);
  const [scanning, setScanning] = useState(false);
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);

  const anomalies = [
    {
      id: 'anom-1',
      emp: 'Rohan Iyer',
      type: 'Overtime Discrepancy',
      severity: 'Medium',
      desc: 'Logged 54 working hours this week against 40 standard basic hours.',
      suggestion: 'Requires manager approval for 14 hours overtime compensation.'
    },
    {
      id: 'anom-2',
      emp: 'Priya Sharma',
      type: 'Unpaid Leave Deductions',
      severity: 'Low',
      desc: '1 Unpaid leave day pending payroll deduction calculation for current cycle.',
      suggestion: 'Auto-deduct 1/22 basic daily wage during final payslip generation.'
    }
  ].filter(a => !resolvedIds.includes(a.id));

  function runScan() {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      toast('success', 'Payroll anomaly engine: All payroll records verified.');
    }, 900);
  }

  function resolveAnomaly(id: string) {
    setResolvedIds(prev => [...prev, id]);
    toast('success', 'Anomaly exception approved and resolved.');
  }

  return (
    <Modal open title="Payroll Anomaly Detection Engine" onClose={onClose} width="lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-lg bg-[#fffbeb] border border-[#fef3c7] p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fef3c7] text-[#d97706]">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#92400e]">Real-Time Compliance & Calculation Guard</p>
              <p className="text-[11.5px] text-[#b45309]">
                {anomalies.length > 0
                  ? `${anomalies.length} potential anomalies detected across active employee wages.`
                  : 'Zero anomalies found. All payroll calculations are in strict compliance.'}
              </p>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={runScan} loading={scanning}>
            <RefreshCw size={13} className={scanning ? 'animate-spin' : ''} /> Rescan Engine
          </Button>
        </div>

        <div className="space-y-3 max-h-[380px] overflow-y-auto">
          {anomalies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 size={36} className="text-[#16a34a] mb-2" />
              <p className="text-sm font-bold text-[#0f172a]">All Payroll Records Clear</p>
              <p className="text-xs text-[#64748b] max-w-sm mt-1">
                No wage discrepancies, overtime overflows, or statutory deduction mismatches detected.
              </p>
            </div>
          ) : (
            anomalies.map((a) => (
              <div key={a.id} className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0f172a]">{a.emp}</span>
                    <span className="rounded bg-[#fee2e2] px-2 py-0.5 text-[10px] font-bold text-[#dc2626]">
                      {a.type}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#b45309] bg-[#fef3c7] px-2 py-0.5 rounded">
                    {a.severity} Severity
                  </span>
                </div>
                <p className="text-xs text-[#334155]">{a.desc}</p>
                <div className="mt-3 flex items-center justify-between rounded bg-[#f8fafc] p-2 border border-[#f1f5f9]">
                  <span className="text-[11.5px] text-[#475569] font-medium">💡 {a.suggestion}</span>
                  <button
                    onClick={() => resolveAnomaly(a.id)}
                    className="rounded bg-[#0284c7] hover:bg-[#0369a1] text-white px-2.5 py-1 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 size={12} /> Approve Exception
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end border-t border-[#e2e8f0] pt-3">
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// 3. Company Salary Master Modal
// ============================================================================
export function SalaryMasterModal({ onClose }: { onClose: () => void }) {
  const toast = useToasts((s) => s.toast);
  const [config, setConfig] = useState({
    basicPct: '50',
    hraPct: '20',
    allowancePct: '30',
    pfRate: '12',
    taxSlab: 'New Tax Regime (FY 2026-27)',
    gratuity: 'Applicable after 5 years',
  });

  function saveConfig() {
    toast('success', 'Company Salary Master configuration updated.');
    onClose();
  }

  return (
    <Modal open title="Company Salary Structure Master" onClose={onClose} width="lg">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-[#475569]">
          Configure company-wide standard component breakdown percentages applied to all CTC calculations.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Basic Pay Allocation (% of CTC)">
            <Input
              type="number"
              value={config.basicPct}
              onChange={(e) => setConfig({ ...config, basicPct: e.target.value })}
            />
          </Field>
          <Field label="House Rent Allowance (HRA % of CTC)">
            <Input
              type="number"
              value={config.hraPct}
              onChange={(e) => setConfig({ ...config, hraPct: e.target.value })}
            />
          </Field>
          <Field label="Special & Conveyance Allowance (% of CTC)">
            <Input
              type="number"
              value={config.allowancePct}
              onChange={(e) => setConfig({ ...config, allowancePct: e.target.value })}
            />
          </Field>
          <Field label="Provident Fund (PF) Statutory Rate (%)">
            <Input
              type="number"
              value={config.pfRate}
              onChange={(e) => setConfig({ ...config, pfRate: e.target.value })}
            />
          </Field>
          <Field label="Taxation Default Regime">
            <Select
              value={config.taxSlab}
              onChange={(e) => setConfig({ ...config, taxSlab: e.target.value })}
            >
              <option value="New Tax Regime (FY 2026-27)">New Tax Regime (FY 2026-27)</option>
              <option value="Old Tax Regime (With 80C/80D Exemptions)">Old Tax Regime (With 80C/80D)</option>
            </Select>
          </Field>
          <Field label="Statutory Gratuity Policy">
            <Input
              value={config.gratuity}
              onChange={(e) => setConfig({ ...config, gratuity: e.target.value })}
            />
          </Field>
        </div>

        <div className="rounded-lg bg-[#f0f9ff] border border-[#bae6fd] p-3 text-xs text-[#0369a1]">
          <span className="font-bold">Summary Component Formula:</span> Basic ({config.basicPct}%) + HRA ({config.hraPct}%) + Allowance ({config.allowancePct}%) = 100% CTC
        </div>

        <div className="flex justify-end gap-2 border-t border-[#e2e8f0] pt-3">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={saveConfig}>Save Structure Master</Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// 4. Shift Allocation Modal
// ============================================================================
export function ShiftAllocationModal({ onClose }: { onClose: () => void }) {
  const toast = useToasts((s) => s.toast);

  const shifts = [
    { name: 'General Day Shift', timing: '09:00 AM – 06:00 PM', grace: '15 Mins', depts: 'Engineering, Management, HR', count: 18 },
    { name: 'Morning Operations Shift', timing: '06:00 AM – 03:00 PM', grace: '10 Mins', depts: 'Support, Logistics', count: 8 },
    { name: 'Night Support Shift', timing: '09:00 PM – 06:00 AM', grace: '15 Mins', depts: 'IT Infrastructure, Security', count: 4 },
  ];

  return (
    <Modal open title="Shift Rosters & Schedule Allocation" onClose={onClose} width="lg">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-[#475569]">
          Manage active company shift schedules, grace periods for biometric check-in, and department assignments.
        </p>

        <div className="space-y-3">
          {shifts.map((s, idx) => (
            <div key={idx} className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#0f172a]">{s.name}</span>
                  <span className="rounded bg-[#e0f2fe] text-[#0369a1] text-[10px] font-bold px-2 py-0.5">
                    {s.count} Employees
                  </span>
                </div>
                <p className="text-xs text-[#475569] mt-1 font-mono">{s.timing} · Grace: {s.grace}</p>
                <p className="text-[11px] text-[#64748b] mt-0.5">Assigned to: {s.depts}</p>
              </div>
              <button
                onClick={() => toast('success', `Shift parameters updated for ${s.name}`)}
                className="portal-btn-action text-[#0284c7] hover:bg-[#e0f2fe] self-start sm:self-auto cursor-pointer"
              >
                Modify Roster
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-[#e2e8f0] pt-3">
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// 5. HR Policies Modal
// ============================================================================
export function HRPoliciesModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState(0);

  const policies = [
    {
      title: 'Attendance & Working Hours Policy',
      content: 'Standard working hours are 8 hours per day, 5 days per week. A grace period of 15 minutes is allowed for morning check-in. Any clock-in past 09:30 AM counts as a late arrival. 3 consecutive late arrivals result in half-day salary deduction unless approved by the reporting manager.'
    },
    {
      title: 'Annual Paid Time Off & Sick Leaves',
      content: 'Full-time employees accrue 1.75 days of Paid Leave per month (21 days annually) and 7 days of Sick Leave. A maximum of 10 unused paid leaves may be carried forward into the next fiscal year. Encashment is calculated at base wage upon exit.'
    },
    {
      title: 'Remote & Hybrid Workplace Guidelines',
      content: 'Employees eligible for hybrid work may work remotely up to 2 days per week with prior manager intimation. Check-in must still be recorded via the online attendance dashboard.'
    },
    {
      title: 'Code of Professional Conduct & Integrity',
      content: 'Zero tolerance for workplace discrimination, harassment, or unauthorized disclosure of proprietary corporate source code and client records.'
    }
  ];

  return (
    <Modal open title="Company HR Policies & Compliance Handbook" onClose={onClose} width="lg">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5 border-r border-[#e2e8f0] pr-2">
          {policies.map((p, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full text-left p-2.5 rounded text-xs font-semibold transition cursor-pointer ${selected === i ? 'bg-[#e0f2fe] text-[#0369a1]' : 'text-[#475569] hover:bg-[#f1f5f9]'}`}
            >
              {p.title}
            </button>
          ))}
        </div>

        <div className="md:col-span-2 flex flex-col justify-between">
          <div className="rounded-lg bg-[#f8fafc] p-4 border border-[#e2e8f0]">
            <h4 className="text-xs font-bold text-[#0f172a] mb-2">{policies[selected].title}</h4>
            <p className="text-xs text-[#334155] leading-relaxed whitespace-pre-line">{policies[selected].content}</p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// 6. Broadcast Announcements Modal
// ============================================================================
export function BroadcastModal({ onClose }: { onClose: () => void }) {
  const toast = useToasts((s) => s.toast);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('General');

  function handleSend() {
    if (!title || !body) return toast('error', 'Please enter a title and announcement message.');
    toast('success', `Broadcast sent: "${title}" posted to all employee dashboards.`);
    onClose();
  }

  return (
    <Modal open title="Broadcast Company Announcement" onClose={onClose} width="md">
      <div className="flex flex-col gap-4">
        <Field label="Announcement Title" required>
          <Input
            placeholder="e.g. Annual Company Offsite 2026 Scheduled"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="General">General Notice</option>
            <option value="Urgent">Urgent / Important</option>
            <option value="Holiday">Holiday Notification</option>
            <option value="Event">Townhall / Event</option>
          </Select>
        </Field>
        <Field label="Message Content" required>
          <textarea
            rows={4}
            className="w-full rounded-md border border-[#cbd5e1] p-2.5 text-xs text-[#0f172a] placeholder-[#94a3b8] focus:border-[#0284c7] focus:outline-none"
            placeholder="Write announcement details for all team members..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2 border-t border-[#e2e8f0] pt-3">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSend}>
            <Send size={13} /> Send Broadcast
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// 7. Holiday Calendar Modal (Employee & HR)
// ============================================================================
export function HolidayCalendarModal({ onClose }: { onClose: () => void }) {
  const holidays = [
    { date: '15 Aug 2026', day: 'Saturday', name: 'Independence Day', type: 'National Holiday' },
    { date: '02 Oct 2026', day: 'Friday', name: 'Mahatma Gandhi Jayanti', type: 'National Holiday' },
    { date: '20 Oct 2026', day: 'Tuesday', name: 'Dussehra / Vijayadashami', type: 'Public Holiday' },
    { date: '08 Nov 2026', day: 'Sunday', name: 'Diwali (Deepavali)', type: 'Public Holiday' },
    { date: '25 Dec 2026', day: 'Friday', name: 'Christmas Day', type: 'Public Holiday' },
    { date: '26 Jan 2027', day: 'Tuesday', name: 'Republic Day', type: 'National Holiday' },
  ];

  return (
    <Modal open title="Official Company Holiday Calendar (2026-2027)" onClose={onClose} width="md">
      <div className="flex flex-col gap-3">
        <div className="space-y-2 max-h-[380px] overflow-y-auto">
          {holidays.map((h, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-[#e2e8f0] bg-white p-3 shadow-2xs">
              <div>
                <p className="text-xs font-bold text-[#0f172a]">{h.name}</p>
                <p className="text-[11.5px] text-[#64748b]">{h.date} · {h.day}</p>
              </div>
              <span className="rounded bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] px-2 py-0.5 text-[10px] font-bold">
                {h.type}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-end border-t border-[#e2e8f0] pt-3">
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// 8. IT & HR Helpdesk Modal (Employee)
// ============================================================================
export function HelpdeskModal({ onClose }: { onClose: () => void }) {
  const toast = useToasts((s) => s.toast);
  const [subject, setSubject] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Payroll');

  function submitTicket() {
    if (!subject || !desc) return toast('error', 'Please complete the ticket subject and description.');
    toast('success', `Support ticket #${Math.floor(1000 + Math.random() * 9000)} submitted to HR.`);
    onClose();
  }

  return (
    <Modal open title="Submit Helpdesk & Support Request" onClose={onClose} width="md">
      <div className="flex flex-col gap-4">
        <Field label="Request Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="Payroll">Payroll / Salary Query</option>
            <option value="Attendance">Attendance / Clock-in Correction</option>
            <option value="Hardware">IT Hardware / Equipment Support</option>
            <option value="HR">HR Policies / Leaves Query</option>
          </Select>
        </Field>
        <Field label="Subject" required>
          <Input
            placeholder="Brief summary of your request"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </Field>
        <Field label="Description" required>
          <textarea
            rows={4}
            className="w-full rounded-md border border-[#cbd5e1] p-2.5 text-xs text-[#0f172a] placeholder-[#94a3b8] focus:border-[#0284c7] focus:outline-none"
            placeholder="Describe what you need assistance with..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2 border-t border-[#e2e8f0] pt-3">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submitTicket}>Submit Ticket</Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// 9. Training & Development Modal (Employee)
// ============================================================================
export function TrainingModal({ onClose }: { onClose: () => void }) {
  const modules = [
    { title: 'Information Security & Data Protection 2026', duration: '45 mins', progress: '100%', status: 'Completed' },
    { title: 'Workplace Ethics & Diversity Standards', duration: '30 mins', progress: '65%', status: 'In Progress' },
    { title: 'Advanced Fullstack Architecture & AI Workflows', duration: '2 hours', progress: '0%', status: 'Assigned' },
  ];

  return (
    <Modal open title="Employee Training & Professional Development" onClose={onClose} width="md">
      <div className="flex flex-col gap-3">
        {modules.map((m, i) => (
          <div key={i} className="rounded-lg border border-[#e2e8f0] bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#0f172a]">{m.title}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${m.status === 'Completed' ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#e0f2fe] text-[#0369a1]'}`}>
                {m.status}
              </span>
            </div>
            <p className="text-[11.5px] text-[#64748b] mb-2">{m.duration} module · Progress: {m.progress}</p>
            <div className="w-full bg-[#f1f5f9] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#0284c7] h-full" style={{ width: m.progress }} />
            </div>
          </div>
        ))}
        <div className="flex justify-end border-t border-[#e2e8f0] pt-3">
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// 10. Projects & Tasks Modal (Employee)
// ============================================================================
export function ProjectsModal({ onClose }: { onClose: () => void }) {
  const projects = [
    { name: 'Crew HRMS Enterprise Architecture', role: 'Lead Frontend & API Integration', deadline: '30 Sep 2026', status: 'Active' },
    { name: 'Automated Payroll Calculation Engine v2', role: 'Algorithm & Formula Verification', deadline: '15 Oct 2026', status: 'Planning' },
  ];

  return (
    <Modal open title="Assigned Projects & Key Deliverables" onClose={onClose} width="md">
      <div className="flex flex-col gap-3">
        {projects.map((p, i) => (
          <div key={i} className="rounded-lg border border-[#e2e8f0] bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#0f172a]">{p.name}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#e0f2fe] text-[#0369a1]">
                {p.status}
              </span>
            </div>
            <p className="text-[11.5px] text-[#334155]">{p.role}</p>
            <p className="text-[11px] text-[#94a3b8] mt-1">Target Completion: {p.deadline}</p>
          </div>
        ))}
        <div className="flex justify-end border-t border-[#e2e8f0] pt-3">
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
