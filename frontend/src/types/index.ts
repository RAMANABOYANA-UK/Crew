// =============================================================
// Crew HRMS — type model. Single source of truth for entities.
// =============================================================

export type Role = 'admin' | 'employee';

export type AttendanceStatus = 'present' | 'absent' | 'half-day' | 'leave';

export type TimeOffType = 'Paid Time Off' | 'Sick Leave' | 'Unpaid Leave';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export type WageType = 'fixed' | 'hourly';

export interface SalaryProfile {
  id: string;
  name: string;
  certification: string | null;
}

export interface PersonalInfo {
  dob: string;                 // yyyy-mm-dd
  personalEmail: string;
  address: string;
  maritalStatus: string;
  bloodGroup: string;
  city: string;
  pincode: string;
}

export interface Employee {
  id: string;
  loginId: string;             // system-generated, read-only
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  department: string;
  designation: string;         // role/title shown on cards
  managerId: string | null;
  dateOfJoining: string;       // yyyy-mm-dd
  avatarColor: string;
  photo: string | null;        // data URL if uploaded

  // schedule (§7.3)
  workingDaysPerWeek: number;
  basicHoursPerDay: number;    // hours

  wageType: WageType;
  fixedWage: number;           // monthly, ₹
  hourlyRate: number;          // ₹ / hour when wageType === hourly

  about: string;
  loveJob: string;
  hobbies: string;
  skills: string[];
  certifications: string[];
  personal: PersonalInfo;
}

export interface SalaryRates {
  basicPct: number;        // % of wage  (50 default)
  hraPctOfBasic: number;   // % of basic (50 default)
  standardPct: number;     // % of wage  (4)
  performancePct: number;  // % of wage  (9.33)
  ltaPct: number;          // % of wage  (8.33)
  pfEmployeePct: number;
  pfEmployerPct: number;
  professionalTax: number; // fixed ₹/month
}

export interface SalaryComponentRow {
  key: string;
  label: string;
  rule: 'percent-wage' | 'percent-basic' | 'fixed' | 'balancing';
  ratePct: number;       // % driver (editable for % rules)
  fixedAmount: number;   // ₹/month (used when fixed)
  note?: string;
}

export interface SalaryBreakdown {
  rows: SalaryComponentRow[];
  totalComponents: number;
  overWage: boolean;         // if non-balancing components exceed wage
  pfEmployee: number;
  pfEmployer: number;
  professionalTax: number;
  grossMonthly: number;
  monthlyDeductions: number;
  netMonthly: number;
  yearlyNet: number;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;               // yyyy-mm-dd
  status: AttendanceStatus;
  checkIn: string | null;     // "HH:mm"
  checkOut: string | null;
  breakMinutes: number;
  source: 'clock' | 'leave' | 'manual';
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  type: TimeOffType;
  startDate: string;
  endDate: string;
  days: number;
  remarks: string;
  attachment: string | null;  // file name
  status: RequestStatus;
  decisionComment?: string;
  createdAt: string;
}

export interface LeaveAllocation {
  type: string;
  defaultDays: number;
  unit: string;
}

export interface Activity {
  id: string;
  employeeId: string;
  icon: 'checkin' | 'checkout' | 'leave' | 'alert' | 'user' | 'payroll';
  title: string;
  meta: string;
  at: string;  // ISO timestamp
}

export interface Company {
  name: string;
  code: string;
  logo: string | null;
}