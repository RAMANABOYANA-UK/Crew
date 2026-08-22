// =============================================================
// Crew HRMS — Payable-days computation  (§7.3)
//
// Payroll rule: attendance + approved leave is the source of truth.
//   PayableDays  = Present + half-day + paid approved leave
//   Unpaid leave / missing attendance automatically reduces
//   payable days (unpaidPenaltyDays).
// =============================================================
import { countWorkingDays } from './utils';
import type { AttendanceRecord, TimeOffRequest } from '@/types';

export interface PayableSummary {
  totalWorkingDays: number;
  presentDays: number;
  leaveDays: number;        // approved paid leave days
  unpaidDays: number;       // approved unpaid leave + absences
  halfDays: number;
  payableDays: number;
  unpaidPenaltyDays: number;
}

export function computePayableDays(
  records: AttendanceRecord[],
  requests: TimeOffRequest[],
  dateFrom: string,
  dateTo: string,
  paidLeaveTypes: string[] = ['Paid Time Off', 'Sick Leave'],
): PayableSummary {
  const inRange = records.filter((r) => r.date >= dateFrom && r.date <= dateTo);

  const approved = requests.filter((r) => r.status === 'approved');
  const paidLeaveDays = approved
    .filter((r) => paidLeaveTypes.includes(r.type))
    .reduce((s, r) => s + Math.max(0, r.days), 0);
  const unpaidLeaveDays = approved
    .filter((r) => !paidLeaveTypes.includes(r.type))
    .reduce((s, r) => s + Math.max(0, r.days), 0);

  const presentDays = inRange.filter((r) => r.status === 'present').length;
  const halfDays = inRange.filter((r) => r.status === 'half-day').length;
  const absentDays = inRange.filter((r) => r.status === 'absent').length;
  const leaveRecordDays = inRange.filter((r) => r.status === 'leave').length;
  const totalWorkingDays = countWorkingDays(dateFrom, dateTo);

  return {
    totalWorkingDays,
    presentDays,
    leaveDays: paidLeaveDays,
    unpaidDays: unpaidLeaveDays,
    halfDays,
    payableDays: presentDays + halfDays + paidLeaveDays,
    unpaidPenaltyDays: absentDays + leaveRecordDays + unpaidLeaveDays,
  };
}