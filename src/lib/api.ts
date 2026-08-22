// =============================================================
// Crew HRMS — mock API layer.
// Simulates a backend: latency + localStorage persistence so every
// screen exercise real async loading/optimistic-UI behaviour that a
// future server adapter can replace 1:1.
// =============================================================
import type { Activity, AttendanceRecord, Company, Employee, LeaveAllocation, SalaryRates, TimeOffRequest, TimeOffType } from '@/types';
import type { SalaryBreakdown } from '@/types';
import { buildSeed } from './seed';
import { todayISO, nowTime, countWorkingDays } from './utils';
import { DEFAULT_SALARY_RATES, defaultBreakdownRows, computeSalary } from './salary';
import { companyCodeFromName } from './login';
import { format, subDays } from 'date-fns';

export interface DB {
  company: Company;
  employees: Employee[];
  attendance: AttendanceRecord[];
  timeOff: TimeOffRequest[];
  activities: Activity[];
  allocations: LeaveAllocation[];
  salaryRates: Record<string, SalaryRates>;
  sessionUserId: string | null;
}

const KEY = 'crew-hrms-db-v1';
const LATENCY = 550;

function freshDB(): DB {
  const seed = buildSeed();
  const rates: Record<string, SalaryRates> = {};
  seed.employees.forEach((e) => { rates[e.id] = { ...DEFAULT_SALARY_RATES }; });
  return { ...seed, salaryRates: rates, sessionUserId: null };
}

let cache: DB | null = null;

function loadDB(): DB {
  if (cache) return cache;
  const raw = globalThis.localStorage?.getItem(KEY);
  if (raw) {
    try { const parsed = JSON.parse(raw) as DB; cache = parsed; return parsed; } catch { /* corrupt → reseed */ }
  }
  cache = seedDB();
  return cache;
}

function persist() {
  if (cache) {
    try { globalThis.localStorage?.setItem(KEY, JSON.stringify(cache)); } catch { /* quota */ }
  }
}

const delay = (ms: number = LATENCY) => new Promise<void>((res) => setTimeout(res, ms));

function todayStr(): string { return todayISO(); }

function loginIdFor(db: DB, companyName: string, fn: string, ln: string, year: number): string {
  const serial = db.employees.length + 1;
  const code = companyCodeFromName(companyName);
  const seg = `${(fn || 'XX').slice(0, 2).toUpperCase()}${(ln || 'XX').slice(0, 2).toUpperCase()}`;
  return `${code}${seg}${String(year).padStart(4, '0')}${String(serial).padStart(4, '0')}`;
}

let seedCount = 0;
function seedDB(): DB {
  const d = freshDB();
  seedCount++;
  return d;
}

export const api = {
  // ---------------- company / auth ----------------
  getCompany: async (): Promise<Company> => { await delay(); return loadDB().company; },

  login: async (identifier: string, password: string): Promise<Employee> => {
    await delay(480);
    const db = loadDB();
    const id = identifier.trim().toLowerCase();
    const emp = db.employees.find((e) =>
      e.email.toLowerCase() === id || e.loginId.toLowerCase() === id);
    if (!emp || password !== 'Crew@1234') {
      const err = new Error('Invalid Login ID / Email or password. Please try again.');
      (err as Error & { code?: string }).code = 'AUTH';
      throw err;
    }
    db.sessionUserId = emp.id;
    persist();
    return emp;
  },

  signup: async (payload: { companyName: string; logo: string | null; firstName: string; lastName: string; email: string; phone: string; password: string }): Promise<{ emp: Employee; company: Company }> => {
    await delay(600);
    const db = loadDB();
    const company: Company = { name: payload.companyName, code: companyCodeFromName(payload.companyName), logo: payload.logo };
    const admin: Employee = {
      id: `emp-${Date.now()}`,
      loginId: loginIdFor(db, payload.companyName, payload.firstName, payload.lastName, new Date().getFullYear()),
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      role: 'admin',
      department: 'HR & Operations',
      designation: 'HR Officer',
      managerId: null,
      dateOfJoining: todayStr(),
      avatarColor: '#6d4aff',
      photo: null,
      workingDaysPerWeek: 5,
      basicHoursPerDay: 8,
      wageType: 'fixed',
      fixedWage: 0,
      hourlyRate: 0,
      about: '',
      loveJob: '',
      hobbies: '',
      skills: [],
      certifications: [],
      personal: { dob: '', personalEmail: '', address: '', maritalStatus: '', bloodGroup: '', city: '', pincode: '' },
    };
    db.company = company;
    db.employees = [admin, ...db.employees.filter((e) => e.id !== admin.id)];
    db.salaryRates[admin.id] = { ...DEFAULT_SALARY_RATES };
    db.sessionUserId = admin.id;
    persist();
    return { emp: admin, company };
  },

  logout: async (): Promise<void> => { await delay(120); loadDB().sessionUserId = null; persist(); },
// ---------------- employees ----------------
  getEmployees: async (): Promise<Employee[]> => { await delay(); return loadDB().employees; },
  getEmployee: async (id: string): Promise<Employee | undefined> => { await delay(300); return loadDB().employees.find((e) => e.id === id); },

  addEmployee: async (input: {
    firstName: string; lastName: string; email: string; phone: string;
    department: string; designation: string; managerId: string | null;
    role: 'admin' | 'employee'; dateOfJoining: string; wage: number; photo: string | null;
  }): Promise<{ emp: Employee; tempPassword: string }> => {
    await delay(700);
    const db = loadDB();
    const year = new Date(input.dateOfJoining).getFullYear();
    const serial = db.employees.length + 1;
    const loginId = `${companyCodeFromName(db.company.name)}${(input.firstName || 'XX').slice(0, 2).toUpperCase()}${(input.lastName || 'XX').slice(0, 2).toUpperCase()}${String(year).padStart(4, '0')}${String(serial).padStart(4, '0')}`;
    const emp: Employee = {
      id: `emp-${Date.now()}`,
      loginId,
      firstName: input.firstName, lastName: input.lastName, email: input.email, phone: input.phone,
      role: input.role, department: input.department, designation: input.designation,
      managerId: input.managerId ?? db.employees[0]?.id ?? null,
      dateOfJoining: input.dateOfJoining, avatarColor: '#6d4aff', photo: input.photo,
      workingDaysPerWeek: 5, basicHoursPerDay: 8,
      wageType: 'fixed', fixedWage: input.wage, hourlyRate: 0,
      about: '', loveJob: '', hobbies: '', skills: [], certifications: [],
      personal: { dob: '', personalEmail: '', address: '', maritalStatus: '', bloodGroup: '', city: '', pincode: '' },
    };
    db.employees.push(emp);
    db.salaryRates[emp.id] = { ...DEFAULT_SALARY_RATES };
    db.activities.unshift({
      id: `act-${Date.now()}`, employeeId: emp.id, icon: 'user',
      title: `${emp.firstName} ${emp.lastName} joined ${db.company.name}`,
      meta: 'Just now', at: new Date().toISOString(),
    });
    persist();
    const tempPassword = 'Crew@1234'; // demo build: system-generated secret exposed in success dialog
    return { emp, tempPassword };
  },

  updateEmployeeProfile: async (id: string, patch: Partial<Employee>): Promise<Employee> => {
    await delay(420);
    const db = loadDB();
    const idx = db.employees.findIndex((e) => e.id === id);
    if (idx < 0) throw new Error('Employee not found');
    db.employees[idx] = { ...db.employees[idx], ...patch };
    persist();
    return db.employees[idx];
  },

  getSalaryRates: async (id: string): Promise<SalaryRates> => { await delay(240); return loadDB().salaryRates[id] ?? { ...DEFAULT_SALARY_RATES }; },

  updateSalary: async (
    id: string,
    partial: Partial<SalaryRates> & { wage?: number; wageType?: 'fixed' | 'hourly'; workingDaysPerWeek?: number; basicHoursPerDay?: number },
  ): Promise<void> => {
    await delay(420);
    const db = loadDB();
    db.salaryRates[id] = { ...(db.salaryRates[id] ?? DEFAULT_SALARY_RATES), ...partial };
    const emp = db.employees.find((e) => e.id === id);
    if (emp) {
      if (typeof partial.wage === 'number') emp.fixedWage = partial.wage;
      if (partial.wageType) emp.wageType = partial.wageType;
      if (typeof partial.workingDaysPerWeek === 'number') emp.workingDaysPerWeek = partial.workingDaysPerWeek;
      if (typeof partial.basicHoursPerDay === 'number') emp.basicHoursPerDay = partial.basicHoursPerDay;
    }
    persist();
  },
// ---------------- attendance ----------------
  getAttendance: async (opts: { employeeId?: string; from: string; to: string }): Promise<AttendanceRecord[]> => {
    await delay(360);
    const db = loadDB();
    return db.attendance
      .filter((r) => r.date >= opts.from && r.date <= opts.to && (!opts.employeeId || r.employeeId === opts.employeeId))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  getToday: async (employeeId: string): Promise<AttendanceRecord | null> => {
    await delay(180);
    const db = loadDB();
    return db.attendance.find((r) => r.employeeId === employeeId && r.date === todayISO()) ?? null;
  },

  checkIn: async (employeeId: string): Promise<AttendanceRecord> => {
    await delay(320);
    const db = loadDB();
    const today = todayISO();
    const existing = db.attendance.find((r) => r.employeeId === employeeId && r.date === today);
    const rec: AttendanceRecord = {
      id: existing?.id ?? `att-today-${employeeId}`,
      employeeId, date: today, status: 'present', checkIn: existing?.checkIn ?? nowTime(), checkOut: existing?.checkOut ?? null,
      breakMinutes: existing?.breakMinutes ?? 0, source: 'clock',
    };
    if (existing) Object.assign(existing, rec); else db.attendance.push(rec);
    const emp = db.employees.find((e) => e.id === employeeId);
    db.activities.unshift({
      id: `act-${Date.now()}`, employeeId, icon: 'checkin',
      title: `${emp?.firstName ?? ''} checked in`, meta: 'Just now', at: new Date().toISOString(),
    });
    persist();
    return rec;
  },

  checkOut: async (employeeId: string): Promise<AttendanceRecord> => {
    await delay(320);
    const db = loadDB();
    const today = todayISO();
    const rec = db.attendance.find((r) => r.employeeId === employeeId && r.date === today);
    if (!rec || !rec.checkIn) throw new Error('No active check-in found for today. Check In first.');
    rec.checkOut = nowTime();
    rec.status = 'present';
    const emp = db.employees.find((e) => e.id === employeeId);
    db.activities.unshift({
      id: `act-${Date.now()}`, employeeId, icon: 'checkout',
      title: `${emp?.firstName ?? ''} checked out`, meta: 'Just now', at: new Date().toISOString(),
    });
    persist();
    return rec;
  },

// ---------------- time off ----------------
  getTimeOff: async (opts: { employeeId?: string } = {}): Promise<TimeOffRequest[]> => {
    await delay(360);
    const db = loadDB();
    return db.timeOff
      .filter((r) => !opts.employeeId || r.employeeId === opts.employeeId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  submitTimeOff: async (input: {
    employeeId: string; type: TimeOffType; startDate: string; endDate: string; remarks: string; attachment: string | null;
  }): Promise<TimeOffRequest> => {
    await delay(520);
    const db = loadDB();
    if (input.endDate < input.startDate) throw new Error('End date cannot be before start date.');
    if (input.type === 'Sick Leave' && !input.attachment) throw new Error('A sick-leave certificate attachment is required.');
    const req: TimeOffRequest = {
      id: `tof-${Date.now()}`, employeeId: input.employeeId, type: input.type,
      startDate: input.startDate, endDate: input.endDate,
      days: countWorkingDays(input.startDate, input.endDate) || 1,
      remarks: String(input.remarks), attachment: input.attachment, status: 'pending',
      createdAt: new Date().toISOString(),
    };
    db.timeOff.unshift(req);
    const emp = db.employees.find((e) => e.id === input.employeeId);
    db.activities.unshift({
      id: `act-${Date.now()}`, employeeId: input.employeeId, icon: 'leave',
      title: `${emp?.firstName ?? ''} applied for ${input.type}`, meta: 'Pending · Just now', at: new Date().toISOString(),
    });
    persist();
    return req;
  },

  decideTimeOff: async (id: string, status: 'approved' | 'rejected', comment: string): Promise<TimeOffRequest> => {
    await delay(380);
    const db = loadDB();
    const req = db.timeOff.find((r) => r.id === id);
    if (!req) throw new Error('Request not found');
    req.status = status;
    req.decisionComment = comment;
    persist();
    return { ...req };
  },

  getAllocations: async (): Promise<LeaveAllocation[]> => { await delay(200); return loadDB().allocations; },
  updateAllocation: async (type: string, days: number): Promise<void> => {
    await delay(280);
    const db = loadDB();
    const a = db.allocations.find((x) => x.type === type);
    if (a) a.defaultDays = days;
    persist();
  },
// ---------------- activity + reports ----------------
  getActivities: async (): Promise<Activity[]> => { await delay(200); return loadDB().activities; },

  getPayslips: async (employeeId: string): Promise<{ id: string; month: string; computed: SalaryBreakdown }[]> => {
    await delay(420);
    const db = loadDB();
    const emp = db.employees.find((e) => e.id === employeeId);
    if (!emp) return [];
    const rates = db.salaryRates[employeeId] ?? DEFAULT_SALARY_RATES;
    const out: { id: string; month: string; computed: SalaryBreakdown }[] = [];
    for (let m = 0; m < 4; m++) {
      const d = subDays(new Date(), m * 30);
      out.push({
        id: `ps-${employeeId}-${format(d, 'yyyy-MM')}`,
        month: format(d, 'MMMM yyyy'),
        computed: computeSalary(emp.fixedWage, defaultBreakdownRows(rates), rates.pfEmployeePct, rates.pfEmployerPct, rates.professionalTax),
      });
    }
    return out;
  },

  getReport: async (): Promise<{ attendanceTrend: { day: string; present: number; absent: number }[]; leaveBalance: { type: string; used: number; total: number }[]; payrollByDept: { dept: string; total: number }[] }> => {
    await delay(460);
    const db = loadDB();
    const from = format(subDays(new Date(), 13), 'yyyy-MM-dd');
    const to = todayStr();
    const daysRecent = db.attendance.filter((r) => r.date >= from && r.date <= to);
    const byDate = new Map<string, { present: number; absent: number }>();
    daysRecent.forEach((r) => {
      const prev = byDate.get(r.date) ?? { present: 0, absent: 0 };
      if (r.status === 'present' || r.status === 'half-day') prev.present++;
      else if (r.status === 'absent' || r.status === 'leave') prev.absent++;
      byDate.set(r.date, prev);
    });
    const attendanceTrend = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, v]) => ({ day: format(new Date(day + 'T00:00:00'), 'dd MMM'), ...v }));

    const leaveBalance = db.allocations.map((a) => {
      const used = db.timeOff.filter((r) => r.type === a.type && r.status !== 'rejected').reduce((s, r) => s + r.days, 0);
      return { type: a.type, used, total: a.defaultDays };
    });

    const payrollByDeptMap = new Map<string, number>();
    db.employees.forEach((e) => {
      payrollByDeptMap.set(e.department, (payrollByDeptMap.get(e.department) ?? 0) + e.fixedWage);
    });
    const payrollByDept = [...payrollByDeptMap.entries()].map(([dept, total]) => ({ dept, total }));

    return { attendanceTrend, leaveBalance, payrollByDept };
  },
};

export { loadDB, persist };
export type Api = typeof api;