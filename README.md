# Crew

**Every workday, perfectly aligned.**

Crew is a Human Resource Management System (HRMS) frontend covering authentication, employee directory, profiles, attendance, time-off/leave management, and payroll visibility — built around two roles: **Admin/HR Officer** and **Employee**.

This repo currently contains the **product spec and frontend build prompt** used to generate the app with Antigravity. Application code will live alongside this file once scaffolded.

---

## 📄 Contents

| File | Purpose |
|---|---|
| `Crew-HRMS-Frontend-Prompt.md` | The complete frontend build brief — design system, every screen/module broken down field-by-field, business rules, role permissions, and folder structure. Paste this into Antigravity to generate the UI. |
| `README.md` | This file — project orientation. |

---

## 🧭 What Crew Does

| Module | Summary |
|---|---|
| **Authentication** | Sign In / Sign Up, system-generated Login IDs, admin-provisioned employee accounts |
| **Employee Directory** | Searchable card/list grid of employees with live status (present / on leave / absent) |
| **Profile** | Resume, Private Info, Salary Info (admin-only), and Security tabs per employee |
| **Attendance** | Check In/Out, daily/weekly views, admin-wide visibility, feeds payroll |
| **Time Off** | Paid / Sick / Unpaid leave requests, calendar view, admin approve/reject workflow |
| **Payroll (stub)** | Read-only payslip view for employees, editable salary structure for admins |

Full role-by-role permissions are in **§10** of the prompt file.

---

## 🎨 Design Direction

Crew follows a **professional, minimal, office-appropriate** visual style:

- Light theme, clean surfaces, hairline borders, flat/minimal shadows
- One accent color (deep violet `#6D4AFF`) used sparingly for primary actions
- **Token-driven CSS** — every color/radius/shadow is a CSS custom property, never a hardcoded hex value in a component
- Componentized, reusable patterns (one `Tabs` component, one segmented-control pattern) rather than one-off styles per screen — modeled after the [Uiverse "Cirrus"](https://uiverse.io) design system's approach to tokens and state-driven CSS

Full color palette, typography scale, spacing rules, and the token/component methodology are in **§2** of the prompt file.

---

## 🛠️ Recommended Tech Stack

- React 18+ / TypeScript / Vite
- React Router v6
- Tailwind CSS + CSS custom-property token layer
- React Query (server state) + Zustand/Context (UI state)
- React Hook Form + Zod
- Lucide React (icons), date-fns, Recharts (analytics)

See **§1** and **§13** of the prompt file for the full stack rationale and suggested folder structure.

---

## 🚀 How to Use This Repo

1. Open `Crew-HRMS-Frontend-Prompt.md`.
2. Paste its full contents into Antigravity as the build brief.
3. Build in the sequence suggested in **§14 Build Priority**:
   1. Design tokens + shell/nav + auth
   2. Employee directory + profile (Resume/Private Info)
   3. Attendance (both roles)
   4. Time Off (both roles) + approvals
   5. Salary Info tab + calculation engine
   6. Security tab, notifications, payroll/analytics stub

---

## ▶️ Running the Project

### 1. Online Mode (Cloud Database)

1. Copy `.env.example` to `.env.local`
2. Put your cloud `DATABASE_URL` (Supabase / Neon etc.)
3. Run:

```bash
npx prisma db push
npm run dev
```

### 2. Offline / Local Mode (Recommended for Demo without Internet)

This mode uses local PostgreSQL via Docker. No internet required after setup.

**Step 1: Start local database**

```bash
docker-compose up -d
```

**Step 2: Set local DATABASE_URL**

In your `.env.local` use:

```env
DATABASE_URL="postgresql://dayflow:dayflow123@localhost:5432/dayflow?schema=public"
```

**Step 3: Push schema & run**

```bash
npx prisma db push
npm run dev
```

**Stop the local database**

```bash
docker-compose down
```

> Note: You can switch between Online and Offline mode anytime by just changing the `DATABASE_URL` in `.env.local`.

---

## ⚠️ Known Open Questions

Two ambiguities between the original wireframe and the requirements doc were resolved with explicit assumptions rather than left unspecified — flagged for stakeholder review before pixel-perfect implementation:

1. **Self-registration vs. admin-provisioned accounts** — the PRD describes a general sign-up flow, while the wireframe states only Admin/HR can create employee accounts (with system-generated Login ID + temp password). The prompt treats Sign Up as **first-admin/company registration only**; all other employees are provisioned by Admin/HR.
2. **Employee-facing salary visibility** — the wireframe's employee "My Profile" view has no Salary Info tab, but the PRD requires employees be able to view their own payroll read-only. The prompt surfaces this as a **read-only Salary Info section inside Private Info** for employees.

See **§4.3** and **§6.2/§6.6** of the prompt file for full detail.

---

## 📋 Status

- [x] Requirements gathered (wireframe + PRD)
- [x] Frontend build prompt written
- [ ] UI scaffolded in Antigravity
- [ ] Backend/API integration
- [ ] QA against role-permission matrix (§10)
