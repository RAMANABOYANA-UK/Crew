import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell, ChevronDown, LogOut, Menu, Settings as SettingsIcon,
  UserRound, X, CheckCircle2, Clock3, UserPlus, AlertTriangle, Wallet,
  Search, BookOpen, Building2, Calendar, FileText, Award,
  HelpCircle, ShieldCheck, Megaphone, FolderGit2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { QK } from '@/lib/queryKeys';
import { useSession } from '@/lib/store';
import { Avatar } from '@/components/ui/Avatar';
import { ShellStatusDot } from '@/components/ui/Feedback';
import { CheckInOutWidget } from '@/features/attendance/CheckInOutWidget';
import type { Activity, Company, Employee } from '@/types';

const ACTIVITY_ICON: Record<Activity['icon'], React.ReactNode> = {
  checkin: <Clock3 size={14} />,
  checkout: <Clock3 size={14} />,
  leave: <UserPlus size={14} />,
  alert: <AlertTriangle size={14} />,
  user: <UserRound size={14} />,
  payroll: <Wallet size={14} />,
};

export function Shell() {
  const { user, company, role } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const avatarRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const companyQ = useQuery({ queryKey: QK.company, queryFn: () => api.getCompany(), initialData: company ?? undefined });
  const todayQ = useQuery({ queryKey: QK.today(user!.id), queryFn: () => api.getToday(user!.id) });
  const activitiesQ = useQuery({ queryKey: QK.activities, queryFn: () => api.getActivities() });

  const logo = companyQ.data?.logo ?? null;
  const isAdmin = role === 'admin';

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  async function logout() {
    await api.logout();
    useSession.getState().clearSession();
    qc.clear();
    navigate('/signin', { replace: true });
  }

  // Dedicated navigation for HR / Admin
  const adminNavItems = [
    { to: '/employees', label: 'Employee Directory', icon: <UserPlus size={15} /> },
    { to: '/attendance', label: 'Company Attendance', icon: <Clock3 size={15} /> },
    { to: '/time-off', label: 'Leave Approval Hub', icon: <Calendar size={15} /> },
    { to: '/payroll', label: 'Payroll & Wage Engine', icon: <Wallet size={15} /> },
    { to: '/profile', label: 'HR Profile', icon: <UserRound size={15} /> },
  ];

  const adminExtraItems = [
    { label: 'Audit Logs', icon: <ShieldCheck size={15} /> },
    { label: 'Payroll Anomalies', icon: <AlertTriangle size={15} /> },
    { label: 'Company Salary Master', icon: <Award size={15} /> },
    { label: 'Shift Allocation', icon: <Clock3 size={15} /> },
    { label: 'HR Policies', icon: <FileText size={15} /> },
    { label: 'Recruitment & Onboarding', icon: <Building2 size={15} /> },
    { label: 'Broadcast Announcements', icon: <Megaphone size={15} /> },
  ];

  // Dedicated navigation for Employees (Self-Service)
  const employeeNavItems = [
    { to: '/dashboard', label: 'My Dashboard', icon: <Building2 size={15} /> },
    { to: '/profile', label: 'My Profile & Records', icon: <UserRound size={15} /> },
    { to: '/attendance', label: 'My Attendance Logs', icon: <Clock3 size={15} /> },
    { to: '/time-off', label: 'Apply Leave / Time-Off', icon: <Calendar size={15} /> },
    { to: '/payroll', label: 'My Payslips & Wage', icon: <Wallet size={15} /> },
  ];

  const employeeExtraItems = [
    { label: 'Holiday Calendar', icon: <Calendar size={15} /> },
    { label: 'Shift Schedule', icon: <Clock3 size={15} /> },
    { label: 'Training & Development', icon: <BookOpen size={15} /> },
    { label: 'IT & HR Helpdesk', icon: <HelpCircle size={15} /> },
    { label: 'Company Announcements', icon: <Megaphone size={15} /> },
    { label: 'My Assigned Projects', icon: <FolderGit2 size={15} /> },
  ];

  const currentNavItems = isAdmin ? adminNavItems : employeeNavItems;
  const currentExtraItems = isAdmin ? adminExtraItems : employeeExtraItems;

  return (
    <div className="flex min-h-screen bg-[#f1f5f9]">
      <aside className="portal-sidebar hidden md:flex w-[240px] flex-col border-r border-[#e2e8f0] bg-white">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 p-3.5 border-b border-[#e2e8f0]">
          <div className={`flex h-9 w-9 items-center justify-center rounded-md font-bold text-white shadow-sm flex-shrink-0 ${isAdmin ? 'bg-[#4f46e5]' : 'bg-[#0284c7]'}`}>
            {logo ? <img src={logo} alt="" className="h-7 w-7 object-contain" /> : <Building2 size={20} />}
          </div>
          <div className="flex flex-col">
            <span className={`text-[13px] font-black leading-tight tracking-tight ${isAdmin ? 'text-[#4338ca]' : 'text-[#0369a1]'}`}>
              {isAdmin ? 'CREW HR ADMIN' : 'CREW EMPLOYEE'}
            </span>
            <span className="text-[10px] font-bold tracking-tight text-[#64748b] uppercase leading-none">
              {isAdmin ? 'Management Console' : 'Self-Service Portal'}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 bg-white border-b border-[#f1f5f9]">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder={isAdmin ? "Search employees, logs..." : "Search services, policies..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded border border-[#cbd5e1] bg-[#f8fafc] px-2.5 py-1 text-[11.5px] text-[#0f172a] placeholder-[#94a3b8] focus:border-[#0284c7] focus:bg-white focus:outline-none"
            />
            <span className="absolute right-2 text-[10px] text-[#94a3b8] font-mono">Ctrl+K</span>
          </div>
        </div>

        {/* Section Title */}
        <div className="px-3 pt-3 pb-1">
          <div className={`w-full rounded border py-1.5 px-3 text-left text-[12px] font-semibold flex items-center gap-2 ${isAdmin ? 'bg-[#eef2ff] border-[#c7d2fe] text-[#4338ca]' : 'bg-[#f0f9ff] border-[#bae6fd] text-[#0369a1]'}`}>
            <BookOpen size={13} /> {isAdmin ? 'HR Administration' : 'Employee Workspace'}
          </div>
        </div>

        {/* Primary Links */}
        <nav className="flex-1 overflow-y-auto py-1 px-1.5">
          {currentNavItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded text-[12.5px] font-medium transition ${
                  isActive
                    ? isAdmin
                      ? 'bg-[#eef2ff] text-[#4338ca] font-bold'
                      : 'bg-[#e0f2fe] text-[#0369a1] font-bold'
                    : 'text-[#475569] hover:bg-[#f1f5f9]'
                }`
              }
            >
              {it.icon}
              {it.label}
            </NavLink>
          ))}

          <div className="my-2 border-t border-[#f1f5f9]" />

          {currentExtraItems.map((it, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2.5 px-3 py-2 rounded text-[12.5px] font-medium text-[#475569] hover:bg-[#f1f5f9] opacity-75 hover:opacity-100 cursor-pointer"
              onClick={() => navigate(isAdmin ? '/employees' : '/dashboard')}
            >
              {it.icon}
              {it.label}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-40 flex h-13 items-center justify-between border-b border-[#e2e8f0] bg-white px-5 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              className="flex h-8 w-8 items-center justify-center rounded text-muted hover:bg-[#f1f5f9] md:hidden"
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className={`rounded px-2.5 py-1 border ${isAdmin ? 'bg-[#eef2ff] text-[#4338ca] border-[#c7d2fe]' : 'bg-[#f0f9ff] text-[#0369a1] border-[#bae6fd]'}`}>
                {isAdmin ? 'HR Admin Portal · Organization Overview' : `Employee Self-Service · ${user?.designation || 'Staff'}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div ref={bellRef} className="relative">
              <button
                className="flex h-8 w-8 items-center justify-center rounded text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                onClick={() => { setBellOpen((o) => !o); setAvatarOpen(false); }}
              >
                <Bell size={16} />
                {(activitiesQ.data?.length ?? 0) > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 top-10 w-80 rounded-lg border border-[#e2e8f0] bg-white p-2 shadow-xl z-50">
                  <p className="px-2 py-1.5 text-xs font-bold text-[#475569] uppercase">Notifications</p>
                  <ul className="max-h-80 overflow-y-auto">
                    {activitiesQ.data?.slice(0, 8).map((a) => (
                      <li key={a.id} className="flex items-start gap-2.5 p-2 rounded hover:bg-[#f8fafc] text-xs">
                        <span className="mt-0.5 text-[#0284c7]">{ACTIVITY_ICON[a.icon]}</span>
                        <div>
                          <span className="block font-semibold text-[#0f172a]">{a.title}</span>
                          <span className="text-[#64748b]">{a.meta}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              className="flex h-8 w-8 items-center justify-center rounded text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsIcon size={16} />
            </button>

            <div ref={avatarRef} className="relative ml-2 flex items-center gap-2">
              <ShellStatusDot state={todayQ.data?.checkIn ? 'green' : 'gray'} />
              <button
                className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-[#f1f5f9]"
                onClick={() => { setAvatarOpen((o) => !o); setBellOpen(false); }}
              >
                <Avatar name={`${user!.firstName} ${user!.lastName}`} photo={user?.photo} color={user?.avatarColor} size={28} />
                <span className="hidden max-w-[130px] truncate text-[12.5px] font-semibold text-[#1e293b] lg:inline">
                  {user?.firstName} {user?.lastName}
                </span>
                <ChevronDown size={13} className="text-[#94a3b8]" />
              </button>

              {avatarOpen && (
                <div role="menu" className="absolute right-0 top-10 w-56 rounded-lg border border-[#e2e8f0] bg-white p-1.5 shadow-xl z-50">
                  <div className="border-b border-[#f1f5f9] px-2.5 pb-2 pt-1.5">
                    <p className="truncate text-xs font-bold text-[#0f172a]">{user?.firstName} {user?.lastName}</p>
                    <p className="font-mono truncate text-[11px] text-[#64748b]">{user?.loginId}</p>
                    <span className="mt-1 inline-block rounded bg-[#e0f2fe] px-1.5 py-0.5 text-[10px] font-bold text-[#0369a1] uppercase">
                      {role === 'admin' ? 'Admin / HR' : 'Employee'}
                    </span>
                  </div>
                  <button
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-xs font-medium text-[#334155] hover:bg-[#f1f5f9]"
                    onClick={() => { setAvatarOpen(false); navigate('/profile'); }}
                  >
                    <UserRound size={14} /> My Profile
                  </button>
                  <button
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-xs font-medium text-[#dc2626] hover:bg-[#fef2f2]"
                    onClick={logout}
                  >
                    <LogOut size={14} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {mobileOpen && (
          <nav aria-label="Mobile" className="border-b border-[#e2e8f0] bg-white px-4 py-2 md:hidden">
            {currentNavItems.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-[#f1f5f9]"
              >
                {it.icon}
                <span>{it.label}</span>
              </NavLink>
            ))}
          </nav>
        )}

        <main className="flex-1 p-5 overflow-y-auto">
          <div className="mx-auto max-w-[1280px]">
            <Outlet />
          </div>
        </main>
      </div>

      <aside className="fixed bottom-4 right-4 z-30 hidden md:block">
        <CheckInOutWidget />
      </aside>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user, company } = useSession();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl border border-[#e2e8f0]">
        <div className="flex items-center justify-between border-b border-[#f1f5f9] p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#0f172a]"><SettingsIcon size={17} /> Settings</h2>
          <button onClick={onClose} className="rounded p-1 text-[#64748b] hover:bg-[#f1f5f9]">
            <X size={17} />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <SettingRow label="Account name" value={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} />
          <SettingRow label="Login ID" value={user?.loginId ?? '—'} mono />
          <SettingRow label="Company / Institution" value={company?.name ?? '—'} />
          <div className="flex items-center justify-between border-t border-[#f1f5f9] pt-3">
            <span className="text-xs font-semibold text-[#475569]">Session</span>
            <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
              <CheckCircle2 size={13} /> {useSession.getState().role === 'admin' ? 'Admin / HR' : 'Employee'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-semibold text-[#475569]">{label}</span>
      <span className={`text-xs font-medium text-[#0f172a] ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}