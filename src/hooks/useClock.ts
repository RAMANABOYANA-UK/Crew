import { useEffect, useState } from 'react';
import { format } from 'date-fns';

/** Ticks once a second; gives the shell + clock-in widget a live time. */
export function useClock(): { now: Date; time: string } {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return { now, time: format(now, 'hh:mm a') };
}