# Crew — HRMS Frontend

> *Every workday, perfectly aligned.*

A complete, role-driven HRMS frontend built with **React 18 + TypeScript + Vite**, covering
authentication, employee directory, profiles (with a live salary engine), attendance with a
payable-days payroll link, time-off approvals, and an analytics dashboard.

---

## Quick start

```bash
npm install
npm run dev        # → http://localhost:5173
```

Other scripts: `npm run build` (typecheck + production bundle), `npm run preview`, `npm run typecheck`.

### Demo accounts

| Role | Login | Password |
|---|---|---|
| Admin / HR Officer | `aarav@crewline.com` | `Crew@1234` |
| Employee | `priya@company.com` | `Crew@1234` |

You can also sign in with any seeded employee's email or their system-generated **Login ID**.
Sign Up registers a new **company** (first Admin); regular employees are provisioned by HR via
**Add Employee** — their Login ID and temporary password are generated automatically per the
`[Company Code][Name][Year][Serial]` rule.

---

## Feature map

| Module | Highlights |
|---|---|
| **Auth** | App/Web segmented toggle · inline credential errors · password rules + strength meter · "check your inbox" verify state |
| **Shell** | Company logo, role-based nav tabs, live check-in status dot, notifications bell, Settings modal, avatar menu (My Profile / Log Out) |
| **Employees** (Admin) | Card grid ⇄ table toggle, search by name/ID/dept, live status dots (🟢 present · ✈️ leave · 🟡 absent), Add Employee w/ auto-credentials confirmation |
| **Dashboard** (Employee) | Quick-access cards, recent activity feed, profile snapshot |
| **Profile** | Resume (skills/certification chips), Private Info (role-scoped editing), **Salary Info** (live component engine), Security (password change) |
| **Salary engine** | Components auto-computed from wage (Basic 50% → HRA 50% of Basic → … ), Fixed Allowance auto-balances to wage, over-wage validation, PF + professional tax, month ⇄ year derivation |
| **Attendance** | Admin: day/week views + date navigator. Employee: month view with breaks. §7.3 **Payable days** derived from attendance + approved paid leave |
| **Check In/Out** | Persistent widget; optimistic updates; shell dot turns green instantly |
| **Time Off** | Admin: Paid/Sick sub-tabs, approve/reject with optional comment (optimistic). Employee: monthly calendar, request modal (auto-computed days, sick-certificate attachment, remarks). Allocation policy editor |
| **Payroll & Analytics** | Employee payslips; Admin: employee switcher, salary summary, Recharts attendance trend / dept wages / leave balance |

Role permissions follow the brief's matrix (§10): employees see only themselves; admins browse
others read-only and manage salary/allocation/approvals.

---

## Architecture

```
src/
  app/                 # Shell (nav/dropdowns/settings), route guards
  components/ui/       # Button (+ GlowButton), Inputs, Tabs/Segmented, Modal,
                       # Feedback (badges/status/toasts/empty), Avatar, Skeletons
  features/
    auth/              # SignIn, SignUp, VerifyEmail, PasswordStrength
    employees/         # Directory (grid/list), AddEmployeeModal
    profile/           # ProfilePage, Resume/PrivateInfo/SalaryInfo/Security tabs
    attendance/        # AdminAttendance, MyAttendance, CheckInOutWidget
    timeoff/           # AdminTimeOff (+AllocationPanel), MyTimeOff, RequestModal
    payroll/           # PayrollPage (employee payslips / admin analytics)
    dashboard/         # EmployeeDashboard
  lib/                 # api (mock backend + localStorage), store (session/toasts),
                       # salary engine, payable-days engine, status resolution,
                       # login-id generator, seed data, query keys, utils
  types/               # Employee, AttendanceRecord, TimeOffRequest, SalaryBreakdown…
  hooks/               # useClock
```

- **State**: Zustand for session/UI state; TanStack Query for server data with optimistic
  updates + rollback on Check In/Out and Approve/Reject.
- **Design system**: token-first CSS (`--color-*`, `--radius-*`, `--shadow-*`) with `crew-*`
  BEM-ish component classes; Tailwind v4 bridged onto the same tokens via `@theme`.
- **Mock backend**: every API call simulates latency and persists to `localStorage`
  (`crew-hrms-db-v1` key) so reloads keep your changes. Clear it in DevTools to re-seed.

## Notes

- The dark canvas in the source wireframe was Excalidraw's background — the product ships in the
  light corporate theme specified in §2 (tokens are `[data-theme]`-ready for dark mode later).
- Two spec ambiguities were resolved deliberately: employee self-registration is disabled
  (HR-provisioned accounts only, §4.3), and employees get a read-only **Salary Info** tab (§6.6).
