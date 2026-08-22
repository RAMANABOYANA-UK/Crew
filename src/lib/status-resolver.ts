/**
 * Synthesized Attendance Status Resolver for Dayflow HRMS
 *
 * Resolves day-by-day attendance status at query time without requiring
 * pre-populated dummy database rows for every employee on every day.
 */

export interface ResolveDayStatusParams {
  date: Date;
  attendanceRow?: {
    checkIn?: Date | null;
    checkOut?: Date | null;
    status: string;
  } | null;
  leaveRequestsForDate?: Array<{ status: string }> | null;
  isHoliday?: boolean;
  isWeekend?: boolean;
}

export type DayStatus =
  | "HOLIDAY"
  | "WEEKEND"
  | "ON_LEAVE"
  | "PRESENT"
  | "CHECKED_IN_NOT_OUT"
  | "HALF_DAY"
  | "ABSENT"
  | "NOT_YET_MARKED";

export function resolveDayStatus(params: ResolveDayStatusParams): DayStatus {
  const {
    date,
    attendanceRow,
    leaveRequestsForDate = [],
    isHoliday = false,
    isWeekend = false,
  } = params;

  if (isHoliday) return "HOLIDAY";
  if (isWeekend) return "WEEKEND";

  if (leaveRequestsForDate && leaveRequestsForDate.some((l) => l.status === "APPROVED")) {
    return "ON_LEAVE";
  }

  if (attendanceRow?.checkIn) {
    if (attendanceRow.status === "HALF_DAY") return "HALF_DAY";
    return attendanceRow.checkOut ? "PRESENT" : "CHECKED_IN_NOT_OUT";
  }

  if (attendanceRow?.status === "ON_LEAVE") {
    return "ON_LEAVE";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  if (checkDate < today) {
    return "ABSENT"; // Past day with no check-in, no approved leave, not a holiday/weekend
  }

  return "NOT_YET_MARKED"; // Today or future
}
