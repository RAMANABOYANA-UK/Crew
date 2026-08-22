// =============================================================
// Crew HRMS — status resolution  (§2.1a legend, §7)
//
//   🟢 Green dot     → employee present in the office
//   ✈️ Airplane icon → employee is on approved leave
//   🟡 Yellow dot    → absent (no time-off applied & absent)
// =============================================================
import type { AttendanceRecord, TimeOffRequest } from '@/types';

export type EmployeeTodayStatus = 'present' | 'leave' | 'absent';

export function resolveEmployeeStatus(
  todayRecord: AttendanceRecord | null | undefined,
  requests: TimeOffRequest[],
  statusDate: string,
): EmployeeTodayStatus {
  if (todayRecord?.status === 'present' && todayRecord.checkIn) return 'present';
  const onApprovedLeave = requests.some(
    (r) => r.status === 'approved' && r.startDate <= statusDate && r.endDate >= statusDate,
  );
  if (onApprovedLeave) return 'leave';
  return 'absent';
}

/** Current logged-in user's dot state in the shell nav. */
export function shellDotState(todayRecord: AttendanceRecord | null | undefined): 'green' | 'gray' {
  return todayRecord?.status === 'present' && todayRecord.checkIn ? 'green' : 'gray';
}

export type TimeOffBadge = 'approved' | 'rejected' | 'pending';