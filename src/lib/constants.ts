export const APP_NAME = "Crew";
export const APP_TAGLINE = "Every workday, perfectly aligned.";

export type Role = "EMPLOYEE" | "HR" | "ADMIN";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
  roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
    roles: ["EMPLOYEE", "HR", "ADMIN"],
  },
  {
    label: "Attendance",
    href: "/attendance",
    icon: "Clock",
    roles: ["EMPLOYEE", "HR", "ADMIN"],
  },
  {
    label: "Leave",
    href: "/leave",
    icon: "Calendar",
    roles: ["EMPLOYEE", "HR", "ADMIN"],
  },
  {
    label: "Payroll",
    href: "/payroll",
    icon: "CreditCard",
    roles: ["EMPLOYEE", "HR", "ADMIN"],
  },
  {
    label: "Employees",
    href: "/employees",
    icon: "Users",
    roles: ["HR", "ADMIN"],
  },
  {
    label: "Leave Approvals",
    href: "/leave/approvals",
    icon: "CheckSquare",
    roles: ["HR", "ADMIN"],
  },
  {
    label: "Attendance Risk",
    href: "/attendance/risk",
    icon: "AlertTriangle",
    roles: ["HR", "ADMIN"],
  },
  {
    label: "Action Center",
    href: "/action-center",
    icon: "Zap",
    roles: ["HR", "ADMIN"],
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: "BarChart3",
    roles: ["HR", "ADMIN"],
  },
  {
    label: "Audit Logs",
    href: "/audit",
    icon: "ShieldCheck",
    roles: ["ADMIN"],
  },
  {
    label: "Profile",
    href: "/profile",
    icon: "User",
    roles: ["EMPLOYEE", "HR", "ADMIN"],
  },
];
