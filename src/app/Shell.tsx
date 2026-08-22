import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell, ChevronDown, LogOut, Menu, Settings as SettingsIcon,
  UserRound, X, CheckCircle2, Clock3, UserPlus, AlertTriangle, Wallet,
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
  const avatarRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const companyQ = useQuery({ queryKey: QK.company, queryFn: () => api.getCompany(), initialData: company ?? undefined });
  const todayQ = useQuery({ queryKey: QK.today(user!.id), queryFn: () => api.getToday(user!.id) });
  const activitiesQ = useQuery({ queryKey: QK.activities, queryFn: () => api.getActivities() });

  const logo = companyQ.data?.logo ?? null;
  const brand = companyQ.data?.name ?? 'Crew';

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
const navItems =
    role === 'admin'
      ? [
          { to: '/employees', label: 'Employees' },
          { to: '/attendance', label: 'Attendance' },
          { to: '/time-off', label: 'Time Off' },
          { to: '/payroll', label: 'Payroll' },
        ]
      : [
          { to: '/dashboard', label: 'My Dashboard' },
          { to: '/attendance', label: 'Attendance' },
          { to: '/time-off', label: 'Time Off' },
          { to: '/payroll', label: 'Payroll' },
        ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-cloud/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4">
          <button className="crew-logo crew-focusable" onClick={() => navigate('/')} aria-label="Go to home">
            <span className="crew-logo__mark">{logo ? <img src={logo} alt="" /> : 'C'}</span>
            <span className="crew-logo__name hidden sm:inline">{brand}</span>
          </button>

          {/* Desktop nav */}
          <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 md:flex">
            {navItems.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                className="crew-tabs__t"
                style={({ isActive }) =>
                  isActive
                    ? { color: 'var(--color-accent)', borderBottomColor: 'var(--color-accent)' }
                    : { color: 'var(--color-ink-muted)', borderBottomColor: 'transparent' }
                }
              >
                {it.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            {/* notifications */}
            <div ref={bellRef} className="relative">
              <button
                className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-muted transition hover:bg-[var(--color-section)] hover:text-ink crew-focusable"
                aria-label="Notifications"
                onClick={() => { setBellOpen((o) => !o); setAvatarOpen(false); }}
              >
                <Bell size={17} />
                {(activitiesQ.data?.length ?? 0) > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full" style={{ background: 'var(--color-danger)' }} />
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 top-11 w-80 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-cloud p-2 shadow-[var(--shadow-pop)]">
                  <p className="crew-label-track px-2 py-1.5">Notifications</p>
                  <ul className="max-h-80 overflow-y-auto">
                    {activitiesQ.data?.slice(0, 8).map((a) => (
                      <li key={a.id} className="crew-activity" style={{ padding: '9px 8px' }}>
                        <span className="crew-activity__icon">{ACTIVITY_ICON[a.icon]}</span>
                        <span>
                          <span className="block crew-activity__title">{a.title}</span>
                          <span className="crew-activity__meta">{a.meta}</span>
                        </span>
                      </li>
                    ))}
                    {activitiesQ.data?.length === 0 && <li className="px-2 py-2 text-sm text-muted">No notifications.</li>}
                  </ul>
                </div>
              )}
            </div>

            {/* settings */}
            <button
              className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-muted transition hover:bg-[var(--color-section)] hover:text-ink crew-focusable"
              aria-label="Settings"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsIcon size={18} />
            </button>
{/* status dot + avatar + dropdown */}
            <div ref={avatarRef} className="relative ml-1 flex items-center gap-2">
              <ShellStatusDot state={todayQ.data?.checkIn ? 'green' : 'gray'} />
              <button
                className="flex items-center gap-2 rounded-[var(--radius-md)] px-1.5 py-1 crew-focusable"
                onClick={() => { setAvatarOpen((o) => !o); setBellOpen(false); }}
                aria-haspopup="menu"
                aria-expanded={avatarOpen}
                aria-label="Account menu"
              >
                <Avatar name={`${user!.firstName} ${user!.lastName}`} photo={user?.photo} color={user?.avatarColor} size={32} />
                <span className="hidden max-w-[120px] truncate text-[13px] font-semibold lg:inline">{user?.firstName}</span>
                <ChevronDown size={14} className="text-faint" />
              </button>
              {avatarOpen && (
                <div role="menu" className="absolute right-0 top-11 w-60 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-cloud p-1.5 shadow-[var(--shadow-pop)]">
                  <div className="border-b border-line px-2.5 pb-2 pt-1.5">
                    <p className="truncate text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
                    <p className="crew-mono truncate text-xs text-muted">{user?.loginId}</p>
                    <p
                      className="mt-1 inline-flex px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                      style={{ background: 'var(--color-accent-soft)', color: '#4b33c9', borderRadius: 5 }}
                    >
                      {role === 'admin' ? 'Admin / HR' : 'Employee'}
                    </p>
                  </div>
                  <button
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm text-ink hover:bg-[var(--color-section)]"
                    onClick={() => { setAvatarOpen(false); navigate('/profile'); }}
                  >
                    <UserRound size={15} /> My Profile
                  </button>
                  <button
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm text-danger hover:bg-[var(--color-danger-soft)]"
                    onClick={logout}
                  >
                    <LogOut size={15} /> Log Out
                  </button>
                </div>
              )}
            </div>

            {/* mobile hamburger */}
            <button
              className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-muted hover:bg-[var(--color-section)] md:hidden crew-focusable"
              aria-label="Toggle navigation"
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* mobile nav */}
        {mobileOpen && (
          <nav aria-label="Mobile" className="border-t border-[var(--color-line)] bg-cloud px-4 py-2 md:hidden">
            {navItems.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                onClick={() => setMobileOpen(false)}
                className="block rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-semibold text-muted hover:bg-[var(--color-section)] hover:text-ink"
                style={({ isActive }) => (isActive ? { color: 'var(--color-accent)', background: 'var(--color-accent-soft)' } : {})}
              >
                {it.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6">
        <Outlet />
      </main>

      {/* §5.2 persistent clock widget — docked bottom-left, desktop/tablet */}
      <aside className="fixed bottom-4 left-4 z-30 hidden md:block" aria-label="Check in / check out">
        <CheckInOutWidget />
      </aside>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
// ------------------------------------------------------------------
// Settings — account / app-level preferences (wireframe references a
// Settings entry point near the employee list).
// ------------------------------------------------------------------
function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user, company } = useSession();
  return (
    <div className="crew-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="crew-modal" role="dialog" aria-modal="true" aria-label="Settings">
        <div className="crew-modal__head">
          <h2 className="crew-modal__title flex items-center gap-2"><SettingsIcon size={17} /> Settings</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-muted hover:bg-[var(--color-section)] crew-focusable">
            <X size={17} />
          </button>
        </div>
        <div className="crew-modal__body flex flex-col gap-4">
          <SettingRows user={user} company={company} />
        </div>
      </div>
    </div>
  );
}

function SettingRows({ user, company }: { user: Employee | null; company: Company | null }) {
  return (
    <>
      <SettingRow label="Account name" value={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} />
      <SettingRow label="Login ID" value={user?.loginId ?? '—'} mono />
      <SettingRow label="Company" value={company?.name ?? '—'} />
      <div className="flex items-center justify-between">
        <div>
          <p className="crew-label">Language</p>
          <p className="text-sm">English (India)</p>
        </div>
        <span className="crew-badge crew-badge--neutral">Default</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="crew-label">Dark mode</p>
          <p className="text-sm text-muted">Tokens are ready via <code className="crew-mono">[data-theme=dark]</code>.</p>
        </div>
        <span className="crew-badge crew-badge--info">Soon</span>
      </div>
      <div className="crew-hairline pt-2">
        <p className="crew-label">Session</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-success"><CheckCircle2 size={14} /> Signed in as {useSession.getState().role === 'admin' ? 'Admin / HR Officer' : 'Employee'}</p>
      </div>
    </>
  );
}

function SettingRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="crew-label">{label}</span>
      <span className={`text-sm font-medium text-ink ${mono ? 'crew-mono' : ''}`}>{value}</span>
    </div>
  );
}