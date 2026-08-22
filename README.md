# Crew

**Every workday, perfectly aligned.**

Crew is a Human Resource Management System (HRMS) frontend covering authentication, employee directory, profiles, attendance, time-off/leave management, and payroll visibility — built around two roles: **Admin/HR Officer** and **Employee**.

This repo currently contains the **product spec and frontend build prompt** used to generate the app with Antigravity. Application code will live alongside this file once scaffolded.

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

## ⚠️ Known Open Questions

Two ambiguities between the original wireframe and the requirements doc were resolved with explicit assumptions rather than left unspecified — flagged for stakeholder review before pixel-perfect implementation:

1. **Self-registration vs. admin-provisioned accounts** — the PRD describes a general sign-up flow, while the wireframe states only Admin/HR can create employee accounts (with system-generated Login ID + temp password). The prompt treats Sign Up as **first-admin/company registration only**; all other employees are provisioned by Admin/HR.
2. **Employee-facing salary visibility** — the wireframe's employee "My Profile" view has no Salary Info tab, but the PRD requires employees be able to view their own payroll read-only. The prompt surfaces this as a **read-only Salary Info section inside Private Info** for employees.

---
