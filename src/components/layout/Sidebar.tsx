"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { NAV_ITEMS, APP_NAME, Role } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Clock,
  Calendar,
  CreditCard,
  Users,
  CheckSquare,
  AlertTriangle,
  Zap,
  BarChart3,
  ShieldCheck,
  User,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-4 h-4" />,
  Clock: <Clock className="w-4 h-4" />,
  Calendar: <Calendar className="w-4 h-4" />,
  CreditCard: <CreditCard className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  CheckSquare: <CheckSquare className="w-4 h-4" />,
  AlertTriangle: <AlertTriangle className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  BarChart3: <BarChart3 className="w-4 h-4" />,
  ShieldCheck: <ShieldCheck className="w-4 h-4" />,
  User: <User className="w-4 h-4" />,
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const role = user.role as Role;
  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const renderNavLinks = () => (
    <div className="flex flex-col gap-1 py-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
              isActive
                ? "bg-violet-600 text-white shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn("transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600")}>
                {ICON_MAP[item.icon]}
              </span>
              <span>{item.label}</span>
            </div>
            {isActive && <ChevronRight className="w-4 h-4 opacity-70" />}
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed top-3 left-4 z-40">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-xs focus:outline-none"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200/80 bg-white min-h-screen shrink-0 sticky top-0 h-screen">
        {/* Logo / Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-lg shadow-xs shadow-violet-600/30">
            C
          </div>
          <div>
            <h2 className="font-bold text-slate-900 tracking-tight text-base">{APP_NAME}</h2>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">HRMS Platform</p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Navigation
          </p>
          {renderNavLinks()}
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shrink-0">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.loginId || user.email}
                </p>
                <p className="text-[11px] text-violet-600 font-medium tracking-tight">
                  {user.role}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-40">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center font-bold text-base">
                  C
                </div>
                <span className="font-bold text-slate-900">{APP_NAME}</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{renderNavLinks()}</div>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={logout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
