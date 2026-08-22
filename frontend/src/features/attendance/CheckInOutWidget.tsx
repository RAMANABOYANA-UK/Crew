import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LogIn, LogOut, Clock3 } from 'lucide-react';
import { api } from '@/lib/api';
import { QK } from '@/lib/queryKeys';
import { useSession, useToasts } from '@/lib/store';
import { useClock } from '@/hooks/useClock';
import { Button } from '@/components/ui/Button';
import type { AttendanceRecord } from '@/types';

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function clockTo12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map((n) => Number(n));
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hours = h % 12 === 0 ? 12 : h % 12;
  return `${hours}:${String(m).padStart(2, '0')} ${suffix}`;
}

/**
 * §5.2 — persistent self-service attendance widget.
 * Check In → shell status dot turns green; button swaps to
 * Check Out and shows elapsed context ("Since 10:00 PM").
 */
export function CheckInOutWidget() {
  const { user } = useSession();
  const toast = useToasts((s) => s.toast);
  const qc = useQueryClient();
  const { time } = useClock();

  const today = useQuery({
    queryKey: QK.today(user!.id),
    queryFn: () => api.getToday(user!.id),
  });
  const rec = today.data ?? null;
  const checkedIn = !!rec?.checkIn;
  const checkedOut = !!rec?.checkOut;

  const applyOptimistic = (patch: Partial<AttendanceRecord>) => {
    qc.setQueryData<AttendanceRecord | null>(QK.today(user!.id), (prev) =>
      prev
        ? { ...prev, ...patch }
        : { id: 'opt', employeeId: user!.id, date: new Date().toISOString().slice(0, 10), status: 'present', checkIn: null, checkOut: null, breakMinutes: 0, source: 'clock', ...patch },
    );
  };

  const checkIn = useMutation({
    mutationFn: () => api.checkIn(user!.id),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: QK.today(user!.id) });
      const prev = qc.getQueryData<AttendanceRecord | null>(QK.today(user!.id));
      applyOptimistic({ status: 'present', checkIn: nowTime() });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(QK.today(user!.id), ctx.prev);
      toast('error', 'Check In failed. Please try again.');
    },
    onSuccess: () => {
      toast('success', `Checked in at ${time}. Have a great day!`);
      invalidate();
    },
  });

  const checkOut = useMutation({
    mutationFn: () => api.checkOut(user!.id),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: QK.today(user!.id) });
      const prev = qc.getQueryData<AttendanceRecord | null>(QK.today(user!.id));
      applyOptimistic({ checkOut: nowTime() });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(QK.today(user!.id), ctx.prev);
      toast('error', 'Check Out failed. Please try again.');
    },
    onSuccess: () => {
      toast('success', 'Checked out. See you tomorrow!');
      invalidate();
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: QK.today(user!.id) });
    qc.invalidateQueries({ queryKey: ['attendance'] });
    qc.invalidateQueries({ queryKey: QK.activities });
  }

  const busy = checkIn.isPending || checkOut.isPending;

  return (
    <div className="crew-card crew-card--flat flex flex-col gap-3" style={{ minWidth: 240 }}>
      <div className="flex items-center gap-2">
        <span
          className="crew-dot"
          style={checkedIn && !checkedOut ? { background: 'var(--color-success-dot)' } : { background: '#c3c7cf' }}
        />
        <span className="crew-label-track">
          {checkedIn && !checkedOut ? 'On the clock' : checkedOut ? 'Shift completed' : 'Not checked in'}
        </span>
      </div>

      {checkedIn && !checkedOut && rec?.checkIn && (
        <p className="text-[13px] text-muted">
          Since <span className="font-semibold text-ink">{clockTo12(rec.checkIn)}</span>
        </p>
      )}

      {!checkedIn ? (
        <Button onClick={() => checkIn.mutate()} loading={checkIn.isPending} block>
          <LogIn size={15} /> Check In
        </Button>
      ) : !checkedOut ? (
        <Button variant="secondary" onClick={() => checkOut.mutate()} loading={checkOut.isPending} block>
          <LogOut size={15} /> Check Out
        </Button>
      ) : (
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <Clock3 size={14} aria-hidden /> Done for today — {rec?.checkOut}
        </p>
      )}
      {busy && <span className="text-xs text-faint">Syncing…</span>}
    </div>
  );
}