// =============================================================
// Crew HRMS — deterministic seed data (stable across reloads).
// A seeded PRNG keeps attendance/leave patterns repeatable so the
// UI shows realistic, consistent data on every visit.
// =============================================================
import { format, addDays, subDays } from 'date-fns';
import type { AttendanceRecord, Company, Employee, TimeOffRequest, Activity, LeaveAllocation } from '@/types';
import { generateLoginId } from './login';

const COMPANY: Company = { name: 'Crewline Technologies', code: 'CLT', logo: null };
const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const ts = (d: Date) => d.toISOString();

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toTime(r: number): string {
  const h = 8 + Math.floor(r * 5);           // 08:xx → 13:xx
  const m = Math.floor((r * 97) % 60);       // 0–59 mins
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function mk(
  id: string,
  firstName: string,
  lastName: string,
  email: string,
  role: 'admin' | 'employee',
  department: string,
  designation: string,
  managerId: string | null,
  doj: string,
  color: string,
  wage: number,
): Employee {
  const seq = parseInt(id.replace(/\D/g, ''), 10);
  return {
    id,
    loginId: generateLoginId(COMPANY.name, firstName, lastName, 2022 + (seq % 4), seq + 11),
    firstName, lastName, email, phone: `+91 98${10000000 + seq * 1371}`, role,
    department, designation, managerId, dateOfJoining: doj, avatarColor: color, photo: null,
    workingDaysPerWeek: 5, basicHoursPerDay: 8,
    wageType: 'fixed', fixedWage: wage, hourlyRate: 0,
    about: `${firstName} is part of the ${department} team at ${COMPANY.name}.`,
    loveJob: 'Building things that make the team’s day easier.',
    hobbies: 'Reading, running, and exploring new coffee spots.',
    skills: [],
    certifications: [],
    personal: {
      dob: '1992-04-12', personalEmail: `${firstName.toLowerCase()}@gmail.com`,
      address: 'B-402, Lakeview Residency, Downtown', maritalStatus: 'Married',
      bloodGroup: 'O+', city: 'Mumbai', pincode: '400001',
    },
  };
}
export interface SeedOut {
  company: Company;
  employees: Employee[];
  attendance: AttendanceRecord[];
  timeOff: TimeOffRequest[];
  activities: Activity[];
  allocations: LeaveAllocation[];
}

export function buildSeed(): SeedOut {
  const EMPLOYEES: Employee[] = [
    mk('emp-002', 'Aarav', 'Mehta', 'aarav@crewline.com', 'admin', 'HR & Operations', 'HR Officer', null, '2022-01-10', '#6d4aff', 150000),
    mk('emp-003', 'Priya', 'Sharma', 'priya@company.com', 'employee', 'Engineering', 'Software Engineer II', 'emp-002', '2022-02-01', '#0694a2', 95000),
    mk('emp-004', 'Rohan', 'Iyer', 'rohan@company.com', 'employee', 'Engineering', 'Senior Software Engineer', 'emp-002', '2021-08-16', '#f59e0b', 130000),
    mk('emp-005', 'Sara', 'Khan', 'sara@company.com', 'employee', 'Design', 'Product Designer', 'emp-002', '2023-01-09', '#e5484d', 82000),
    mk('emp-006', 'Vikram', 'Reddy', 'vikram@company.com', 'employee', 'Sales', 'Account Executive', 'emp-002', '2023-06-01', '#2f6fed', 72000),
    mk('emp-007', 'Ananya', 'Das', 'ananya@company.com', 'employee', 'Engineering', 'QA Engineer', 'emp-002', '2023-09-01', '#22a06b', 68000),
    mk('emp-008', 'Kabir', 'Nair', 'kabir@company.com', 'employee', 'Design', 'UI Designer', 'emp-002', '2024-03-15', '#8b5cf6', 61000),
    mk('emp-009', 'Meera', 'Joshi', 'meera@company.com', 'employee', 'Marketing', 'Marketing Lead', 'emp-002', '2024-05-01', '#f0b429', 88000),
  ];
  const empName = (id: string) => {
    const e = EMPLOYEES.find((x) => x.id === id);
    return `${e?.firstName} ${e?.lastName}`;
  };

  const today = new Date();
  const rng = mulberry32(20240001);

  // ------------------------------------------------
  // Attendance — last ~38 weekdays + today.
  // Today is neutral for everyone (status resolved live
  // by the app from check-in / leave state).
  // ------------------------------------------------
  const attendance: AttendanceRecord[] = [];
  let cur = subDays(today, 38);
  while (cur <= today) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) {
      EMPLOYEES.forEach((emp, idx) => {
        const r = rng();
        let status: AttendanceRecord['status'] = 'present';
        if (r < 0.045) status = 'absent';
        else if (r < 0.085) status = 'half-day';
        else if (r < 0.11) status = 'leave';
        const skipClock = status !== 'present';
        attendance.push({
          id: `att-${idx}-${format(cur, 'yyyyMMdd')}`,
          employeeId: emp.id,
          date: iso(cur),
          status,
          checkIn: skipClock ? null : toTime(rng()),
          checkOut: skipClock ? null : toTime(rng()),
          breakMinutes: skipClock ? 0 : 15 + Math.floor(rng() * 35),
          source: status === 'leave' ? 'leave' : 'clock',
        });
      });
    }
    cur = addDays(cur, 1);
  }
  attendance.forEach((a) => {
    if (a.date === iso(today)) {
      a.status = 'present';
      a.checkIn = null;
      a.checkOut = null;
      a.breakMinutes = 0;
    }
  });
// ------------------------------------------------
  // Time-off requests (seeded)
  // ------------------------------------------------
  const timeOff: TimeOffRequest[] = [
    { id: 'tof-1', employeeId: 'emp-004', type: 'Paid Time Off', startDate: iso(subDays(today, 4)), endDate: iso(subDays(today, 3)), days: 2, remarks: 'Family function.', attachment: null, status: 'approved', decisionComment: 'Enjoy!', createdAt: ts(subDays(today, 14)) },
    { id: 'tof-2', employeeId: 'emp-009', type: 'Sick Leave', startDate: iso(addDays(today, 2)), endDate: iso(addDays(today, 2)), days: 1, remarks: 'Medical appointment.', attachment: 'prescription.pdf', status: 'pending', createdAt: ts(subDays(today, 1)) },
    { id: 'tof-3', employeeId: 'emp-005', type: 'Sick Leave', startDate: iso(subDays(today, 2)), endDate: iso(subDays(today, 1)), days: 2, remarks: 'Fever, attaching certificate.', attachment: 'sick-certificate.pdf', status: 'approved', decisionComment: 'Get well soon.', createdAt: ts(subDays(today, 4)) },
    { id: 'tof-4', employeeId: 'emp-003', type: 'Paid Time Off', startDate: iso(addDays(today, 6)), endDate: iso(addDays(today, 8)), days: 3, remarks: 'Travel planned.', attachment: null, status: 'pending', createdAt: ts(subDays(today, 1)) },
    { id: 'tof-5', employeeId: 'emp-007', type: 'Unpaid Leave', startDate: iso(subDays(today, 9)), endDate: iso(subDays(today, 9)), days: 1, remarks: 'Personal work.', attachment: null, status: 'rejected', decisionComment: 'Team capacity low that day; please plan ahead.', createdAt: ts(subDays(today, 30)) },
    { id: 'tof-6', employeeId: 'emp-002', type: 'Paid Time Off', startDate: iso(addDays(today, 12)), endDate: iso(addDays(today, 12)), days: 1, remarks: 'Personal.', attachment: null, status: 'approved', createdAt: ts(subDays(today, 2)) },
  ];

  const activities: Activity[] = [
    { id: 'act-1', employeeId: 'emp-003', icon: 'checkin', title: `${empName('emp-003')} checked in`, meta: 'Today · 08:52 AM', at: ts(today) },
    { id: 'act-2', employeeId: 'emp-005', icon: 'leave', title: `${empName('emp-005')}’s sick leave was approved`, meta: '2 days · Yesterday', at: ts(subDays(today, 1)) },
    { id: 'act-3', employeeId: 'emp-004', icon: 'checkout', title: `${empName('emp-004')} checked out`, meta: 'Yesterday · 06:12 PM', at: ts(subDays(today, 1)) },
    { id: 'act-4', employeeId: 'emp-009', icon: 'leave', title: `${empName('emp-009')} applied for sick leave`, meta: 'Pending · Yesterday', at: ts(subDays(today, 1)) },
    { id: 'act-5', employeeId: 'emp-002', icon: 'user', title: 'Payroll ran for the month', meta: '2 days ago', at: ts(subDays(today, 2)) },
  ];

  const allocations: LeaveAllocation[] = [
    { type: 'Paid Time Off', defaultDays: 24, unit: 'days / year' },
    { type: 'Sick Leave', defaultDays: 7, unit: 'days / year' },
    { type: 'Unpaid Leave', defaultDays: 0, unit: 'uncapped' },
  ];

  return { company: COMPANY, employees: EMPLOYEES, attendance, timeOff, activities, allocations };
}