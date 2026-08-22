"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/useToast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatTime, formatCurrency } from "@/lib/format";
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Users,
  ChevronRight,
  LogIn,
  LogOut,
  Zap,
  ShieldAlert,
  Sparkles,
  ArrowUpRight,
  Bell,
  Briefcase,
} from "lucide-react";

interface TodayAttendance {
  id?: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE" | "NOT_CHECKED_IN";
  hoursWorked?: number | null;
}

interface LeaveRequestItem {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  reason: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

interface AdminStatusSummary {
  employees: Array<{
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    department: string;
    statusDot: "green" | "plane" | "yellow";
    statusLabel: string;
  }>;
  summary: {
    total: number;
    present: number;
    onLeave: number;
    absent: number;
  };
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [adminStatus, setAdminStatus] = useState<AdminStatusSummary | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [riskCount, setRiskCount] = useState(0);
  const [anomaliesCount, setAnomaliesCount] = useState(0);

  const [isCheckInLoading, setIsCheckInLoading] = useState(false);
  const [isCheckOutLoading, setIsCheckOutLoading] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setIsLoading(true);

        // Fetch Today's Attendance
        try {
          const todayRes = await apiFetch<TodayAttendance>("/api/attendance/today");
          setTodayAttendance(todayRes);
        } catch {
          setTodayAttendance({ status: "NOT_CHECKED_IN" });
        }

        // Fetch Leave Requests
        try {
          const leaves = await apiFetch<LeaveRequestItem[]>("/api/leave");
          setLeaveRequests(leaves || []);
        } catch {}

        // Fetch Recent Notifications
        try {
          const notifs = await apiFetch<NotificationItem[]>("/api/notifications?limit=3");
          setNotifications(notifs || []);
        } catch {}

        // If Admin / HR, fetch admin summaries
        if (user?.role === "ADMIN" || user?.role === "HR") {
          try {
            const statusRes = await apiFetch<AdminStatusSummary>("/api/employees/status");
            setAdminStatus(statusRes);
          } catch {}

          try {
            const pendingLeaves = await apiFetch<any[]>("/api/leave/pending");
            setPendingApprovalsCount(pendingLeaves?.length || 0);
          } catch {}

          try {
            const riskData = await apiFetch<any[]>("/api/attendance/risk");
            setRiskCount(riskData?.length || 0);
          } catch {}

          try {
            const anomaliesData = await apiFetch<any[]>("/api/payroll/anomalies");
            setAnomaliesCount(anomaliesData?.length || 0);
          } catch {}
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  const handleCheckIn = async () => {
    try {
      setIsCheckInLoading(true);
      const res = await apiFetch("/api/attendance/check-in", { method: "POST" });
      toast.success("Successfully checked in for today!", "Check-In Success");
      setTodayAttendance(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to check in", "Error");
    } finally {
      setIsCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setIsCheckOutLoading(true);
      const res = await apiFetch("/api/attendance/check-out", { method: "POST" });
      toast.success("Successfully checked out for today!", "Check-Out Success");
      setTodayAttendance(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to check out", "Error");
    } finally {
      setIsCheckOutLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const isCheckedIn = Boolean(todayAttendance?.checkIn);
  const isCheckedOut = Boolean(todayAttendance?.checkOut);
  const isAdminOrHr = user?.role === "ADMIN" || user?.role === "HR";

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-200">
      {/* Page Header */}
      <PageHeader
        title={`Welcome back, ${user?.employee?.firstName || user?.email}`}
        description="Here is your workday overview and status breakdown for today."
        action={
          <div className="flex items-center gap-3">
            <Link href="/attendance">
              <Button variant="outline" size="sm" leftIcon={<Clock className="w-4 h-4" />}>
                View Attendance
              </Button>
            </Link>
            <Link href="/leave">
              <Button variant="primary" size="sm" leftIcon={<Calendar className="w-4 h-4" />}>
                Apply Leave
              </Button>
            </Link>
          </div>
        }
      />

      {/* Admin / HR KPI Summary Banner */}
      {isAdminOrHr && adminStatus && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="bg-gradient-to-br from-white to-slate-50/80">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Present Today</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{adminStatus.summary.present}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">out of {adminStatus.summary.total} active employees</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
                🟢
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/80">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Approvals</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingApprovalsCount}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">leave requests awaiting review</p>
              </div>
              <Link href="/leave/approvals" className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </Link>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/80">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance Risk</p>
                <h3 className="text-2xl font-bold text-rose-600 mt-1">{riskCount}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">employees flagged for review</p>
              </div>
              <Link href="/attendance/risk" className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center hover:scale-105 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </Link>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/80">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payroll Anomalies</p>
                <h3 className="text-2xl font-bold text-violet-600 mt-1">{anomaliesCount}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">salary calculation alerts</p>
              </div>
              <Link href="/action-center" className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </Link>
            </div>
          </Card>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Today Check-In Card & Leave Balances */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today Check In/Out CTA Card */}
          <Card className="border border-violet-100 bg-gradient-to-br from-white via-slate-50/40 to-violet-50/20 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      isCheckedOut
                        ? "gray"
                        : isCheckedIn
                        ? "PRESENT"
                        : todayAttendance?.status === "ON_LEAVE"
                        ? "ON_LEAVE"
                        : "amber"
                    }
                  >
                    {isCheckedOut
                      ? "Checked Out"
                      : isCheckedIn
                      ? "Checked In"
                      : todayAttendance?.status === "ON_LEAVE"
                      ? "On Approved Leave"
                      : "Not Checked In Yet"}
                  </Badge>
                  <span className="text-xs text-slate-400">Today ({formatDate(new Date())})</span>
                </div>

                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {isCheckedOut
                    ? "Great work today!"
                    : isCheckedIn
                    ? "You are checked in for today"
                    : "Ready to start your workday?"}
                </h2>

                <div className="flex items-center gap-6 text-xs text-slate-600 pt-1">
                  <div>
                    <span className="text-slate-400 block">Check In Time:</span>
                    <span className="font-semibold text-slate-800">{formatTime(todayAttendance?.checkIn)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Check Out Time:</span>
                    <span className="font-semibold text-slate-800">{formatTime(todayAttendance?.checkOut)}</span>
                  </div>
                  {todayAttendance?.hoursWorked !== undefined && todayAttendance?.hoursWorked !== null && (
                    <div>
                      <span className="text-slate-400 block">Hours Worked:</span>
                      <span className="font-semibold text-violet-600">{todayAttendance.hoursWorked.toFixed(1)} hrs</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Check In / Out Buttons */}
              <div className="flex sm:flex-col gap-3 shrink-0">
                {!isCheckedIn ? (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleCheckIn}
                    isLoading={isCheckInLoading}
                    leftIcon={<LogIn className="w-4 h-4" />}
                    disabled={todayAttendance?.status === "ON_LEAVE"}
                  >
                    Check In Now
                  </Button>
                ) : !isCheckedOut ? (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleCheckOut}
                    isLoading={isCheckOutLoading}
                    leftIcon={<LogOut className="w-4 h-4 text-rose-600" />}
                    className="border-rose-200 text-rose-700 hover:bg-rose-50"
                  >
                    Check Out Now
                  </Button>
                ) : (
                  <Button variant="secondary" size="lg" disabled leftIcon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}>
                    Shift Completed
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Leave Balances Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Leave Balance Summary</CardTitle>
                <CardDescription>Available paid and sick time-off balances</CardDescription>
              </div>
              <Link href="/leave" className="text-xs text-violet-600 hover:underline font-semibold flex items-center gap-1">
                View Leave Portal <ArrowUpRight className="w-3 h-3" />
              </Link>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-violet-50/60 border border-violet-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-violet-700 uppercase tracking-wider">Paid Leave</span>
                    <h4 className="text-2xl font-bold text-violet-950 mt-1">
                      {user?.employee?.paidLeaveBalance ?? 12} <span className="text-xs font-normal text-violet-600">days</span>
                    </h4>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-violet-200/50 text-violet-700 flex items-center justify-center font-bold text-xs">
                    PAL
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Sick Leave</span>
                    <h4 className="text-2xl font-bold text-emerald-950 mt-1">
                      {user?.employee?.sickLeaveBalance ?? 6} <span className="text-xs font-normal text-emerald-600">days</span>
                    </h4>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-200/50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    SCL
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-100/60 border border-slate-200/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Unpaid Leave</span>
                    <h4 className="text-2xl font-bold text-slate-900 mt-1">
                      Unlimited <span className="text-xs font-normal text-slate-500">subject to review</span>
                    </h4>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-slate-200/60 text-slate-600 flex items-center justify-center font-bold text-xs">
                    UPL
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Leave Requests */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>My Leave Requests</CardTitle>
                <CardDescription>Recent time-off submissions & status</CardDescription>
              </div>
              <Link href="/leave" className="text-xs text-violet-600 hover:underline font-semibold">
                View All →
              </Link>
            </CardHeader>

            <CardContent>
              {leaveRequests.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="w-5 h-5 text-slate-400" />}
                  title="No leave requests filed"
                  description="You haven't submitted any leave requests yet."
                  action={
                    <Link href="/leave">
                      <Button variant="outline" size="sm">Apply for Leave</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {leaveRequests.slice(0, 3).map((req) => (
                    <div key={req.id} className="py-3 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900">{req.leaveType} Leave</span>
                          <span className="text-xs text-slate-400">({req.totalDays} day{req.totalDays > 1 ? "s" : ""})</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {formatDate(req.startDate)} - {formatDate(req.endDate)}
                        </p>
                      </div>
                      <Badge variant={req.status as any}>{req.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Shortcuts & Quick Notifications */}
        <div className="space-y-6">
          {/* Quick Shortcuts */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Shortcuts</CardTitle>
              <CardDescription>Frequently used actions & tasks</CardDescription>
            </CardHeader>

            <CardContent className="space-y-2">
              <Link href="/profile" className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">View Profile & Salary</p>
                    <p className="text-[11px] text-slate-400">Personal & employment details</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600 transition-colors" />
              </Link>

              <Link href="/payroll" className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">View Payslips & Breakdown</p>
                    <p className="text-[11px] text-slate-400">Net salary calculation & PF</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </Link>

              {isAdminOrHr && (
                <>
                  <Link href="/employees" className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900">Employee Directory</p>
                        <p className="text-[11px] text-slate-400">Manage workforce accounts</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
                  </Link>

                  <Link href="/action-center" className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900">Operations Action Center</p>
                        <p className="text-[11px] text-slate-400">Inbox for pending items</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Recent Alerts</CardTitle>
                <CardDescription>Latest system notifications</CardDescription>
              </div>
              <Link href="/notifications" className="text-xs text-violet-600 hover:underline font-semibold">
                All →
              </Link>
            </CardHeader>

            <CardContent>
              {notifications.length === 0 ? (
                <EmptyState
                  icon={<Bell className="w-5 h-5 text-slate-400" />}
                  title="No new notifications"
                  description="You are completely caught up!"
                />
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                      <p className="text-xs text-slate-600">{n.message}</p>
                      <p className="text-[10px] text-slate-400">{formatDate(n.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
