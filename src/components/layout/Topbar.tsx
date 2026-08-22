"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Bell, LogOut, User, Key, ChevronDown, Check, Sparkles } from "lucide-react";
import { formatDate } from "@/lib/format";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export function Topbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch unread count & notifications preview
  useEffect(() => {
    if (!user) return;

    async function loadNotifications() {
      try {
        const countData = await apiFetch<{ unreadCount: number }>("/api/notifications/unread-count");
        setUnreadCount(countData.unreadCount || 0);

        const listData = await apiFetch<NotificationItem[]>("/api/notifications?limit=5");
        setNotifications(listData || []);
      } catch {
        // Silently catch error if notifications endpoint unavailable
      }
    }

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  // Format page context title
  const getPageTitle = () => {
    if (pathname.startsWith("/dashboard")) return "Dashboard";
    if (pathname.startsWith("/attendance/risk")) return "Attendance Risk Engine";
    if (pathname.startsWith("/attendance/corrections")) return "Attendance Corrections";
    if (pathname.startsWith("/attendance")) return "Attendance Management";
    if (pathname.startsWith("/leave/approvals")) return "Leave Approvals Queue";
    if (pathname.startsWith("/leave")) return "Leave & Time-Off";
    if (pathname.startsWith("/payroll")) return "Payroll & Compensation";
    if (pathname.startsWith("/employees/")) return "Employee Profile";
    if (pathname.startsWith("/employees")) return "Employee Directory";
    if (pathname.startsWith("/action-center")) return "Operations Action Center";
    if (pathname.startsWith("/analytics")) return "HR Analytics";
    if (pathname.startsWith("/audit")) return "System Audit Logs";
    if (pathname.startsWith("/profile")) return "My Profile";
    if (pathname.startsWith("/notifications")) return "Notifications";
    return "Crew HRMS";
  };

  const markAllRead = async () => {
    try {
      await apiFetch("/api/notifications", { method: "PATCH" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Ignore
    }
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between">
      {/* Page Title & Breadcrumb */}
      <div className="flex items-center gap-3 pl-10 lg:pl-0">
        <h1 className="text-base font-semibold text-slate-900 tracking-tight">{getPageTitle()}</h1>
        <Badge variant={user.role === "ADMIN" ? "red" : user.role === "HR" ? "amber" : "blue"} size="sm">
          {user.role}
        </Badge>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label="View notifications"
            className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-violet-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in-0 slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900">Notifications</h4>
                  {unreadCount > 0 && <Badge variant="purple" size="sm">{unreadCount} new</Badge>}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Mark read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    <Sparkles className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    You're all caught up!
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 hover:bg-slate-50 transition-colors ${
                        !n.isRead ? "bg-violet-50/30" : ""
                      }`}
                    >
                      <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{formatDate(n.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-slate-100 text-center bg-slate-50/50">
                <Link
                  href="/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="text-xs text-violet-600 font-semibold hover:underline"
                >
                  View all notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
          >
            <Avatar
              src={user.employee?.profilePic}
              firstName={user.employee?.firstName || user.email}
              lastName={user.employee?.lastName}
              size="sm"
            />
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-800">
              {user.employee ? `${user.employee.firstName}` : user.loginId || "User"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-50 animate-in fade-in-0 slide-in-from-top-2 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
              </div>

              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  My Profile
                </Link>
                <Link
                  href="/change-password"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Key className="w-4 h-4 text-slate-400" />
                  Change Password
                </Link>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={logout}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
