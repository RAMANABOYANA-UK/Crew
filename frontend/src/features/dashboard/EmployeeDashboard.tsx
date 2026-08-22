import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck, ChevronRight, Clock3, LogOut, UserRound, Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';
import { QK } from '@/lib/queryKeys';
import { useSession } from '@/lib/store';
import { greeting, todayISO } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { CheckInOutWidget } from '@/features/attendance/CheckInOutWidget';
import type { Activity } from '@/types';

/** §5.3 — plain Employee landing: quick-access cards + recent activity. */
export function EmployeeDashboard() {
  const { user, company } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const today = todayISO();
  const activitiesQ = useQuery({ queryKey: QK.activities, queryFn: () => api.getActivities() });

  async function logout() {
    await api.logout();
    useSession.getState().clearSession();
    qc.clear();
    navigate('/signin', { replace: true });
  }

  const quickLinks = [
    { to: '/profile', label: 'Profile', desc: 'Resume, private info, salary & security', icon: <UserRound size={17} />, color: '#6d4aff' },
    { to: '/attendance', label: 'Attendance', desc: 'Your day-wise attendance for this month', icon: <CalendarCheck size={17} />, color: '#22a06b' },
    { to: '/time-off', label: 'Leave Requests', desc: 'Apply for time off & track approvals', icon: <Clock3 size={17} />, color: '#2f6fed' },
    { to: '/payroll', label: 'Payroll', desc: 'Payslips & compensation summary', icon: <Wallet size={17} />, color: '#f59e0b' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting()}, {user?.firstName} 👋</h1>
          <p className="text-[13px] text-muted">{company?.name ?? 'Crew'} · {today}</p>
        </div>
        <div className="hidden md:block">
          <CheckInOutWidget />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((l) => (
          <Link key={l.to} to={l.to} className="crew-card group block transition hover:border-accent">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]" style={{ background: `${l.color}1f`, color: l.color }}>
              {l.icon}
            </div>
            <p className="flex items-center justify-between text-[15px] font-semibold">
              {l.label}
              <ChevronRight size={15} className="text-faint transition group-hover:translate-x-0.5 group-hover:text-accent" />
            </p>
            <p className="mt-0.5 text-[12.5px] text-muted">{l.desc}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="crew-card lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="crew-label-track">Recent activity</h2>
            <Link to="/time-off" className="text-[12.5px] font-medium text-accent hover:underline">Manage leave requests</Link>
          </div>
          <ActivityList items={activitiesQ.data ?? []} />
        </section>

        <section className="crew-card flex flex-col gap-3">
          <h2 className="crew-label-track">My profile snapshot</h2>
          <div className="flex items-center gap-3">
            <Avatar name={`${user?.firstName} ${user?.lastName}`} photo={user?.photo} color={user?.avatarColor} size={48} />
            <div>
              <p className="text-[15px] font-semibold">{user?.firstName} {user?.lastName}</p>
              <p className="text-[13px] text-muted">{user?.designation} · {user?.department}</p>
            </div>
          </div>
          <div className="mt-auto flex flex-col gap-2 border-t border-line pt-3">
            <Link
              to="/profile"
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-line text-sm font-semibold text-ink transition hover:bg-[var(--color-section)]"
            >
              Open My Profile
            </Link>
            <button
              onClick={logout}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-line text-sm font-semibold text-danger transition hover:bg-[var(--color-danger-soft)]"
            >
              <LogOut size={15} /> Log Out
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

const ACTIVITY_ICON: Record<Activity['icon'], React.ReactNode> = {
  checkin: <Clock3 size={14} />,
  checkout: <Clock3 size={14} />,
  leave: <CalendarCheck size={14} />,
  alert: <span>!</span>,
  user: <UserRound size={14} />,
  payroll: <Wallet size={14} />,
};

function ActivityList({ items }: { items: Activity[] }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">No activity yet.</p>;
  }
  return (
    <ul className="crew-activity">
      {items.slice(0, 6).map((a) => (
        <li key={a.id}>
          <span className="crew-activity__icon">{ACTIVITY_ICON[a.icon]}</span>
          <span>
            <span className="block crew-activity__title">{a.title}</span>
            <span className="crew-activity__meta">{a.meta}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}