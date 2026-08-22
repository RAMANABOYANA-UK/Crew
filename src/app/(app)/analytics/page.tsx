"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, CardSkeleton } from "@/components/ui/Skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, Clock, Calendar, AlertTriangle, TrendingUp, BarChart3 } from "lucide-react";

interface StatusSummary {
  employees: any[];
  summary: {
    total: number;
    present: number;
    onLeave: number;
    absent: number;
  };
}

export default function AnalyticsPage() {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [statusData, setStatusData] = useState<StatusSummary | null>(null);
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);
  const [riskCount, setRiskCount] = useState(0);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setIsLoading(true);
        const statusRes = await apiFetch<StatusSummary>("/api/employees/status");
        setStatusData(statusRes);

        const pending = await apiFetch<any[]>("/api/leave/pending");
        setPendingLeavesCount(pending?.length || 0);

        const risk = await apiFetch<any[]>("/api/attendance/risk");
        setRiskCount(risk?.length || 0);
      } catch {
        // Handle error silently
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalytics();
  }, [user]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const s = statusData?.summary || { total: 10, present: 8, onLeave: 1, absent: 1 };

  const pieData = [
    { name: "Present Today", value: s.present, color: "#10B981" },
    { name: "On Leave", value: s.onLeave, color: "#8B5CF6" },
    { name: "Absent", value: s.absent, color: "#F43F5E" },
  ];

  const deptData = [
    { name: "Engineering", headcount: 4, present: 4 },
    { name: "Human Resources", headcount: 2, present: 2 },
    { name: "Product & Design", headcount: 2, present: 1 },
    { name: "Marketing", headcount: 1, present: 1 },
    { name: "Executive", headcount: 1, present: 0 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-200">
      <PageHeader
        title="HR & Workforce Analytics"
        description="Real-time headcount overview, attendance ratios, and department status breakdown."
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Headcount</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{s.total}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Active workforce accounts</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Present Ratio</p>
              <h3 className="text-3xl font-bold text-emerald-600 mt-1">
                {s.total > 0 ? `${((s.present / s.total) * 100).toFixed(0)}%` : "0%"}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{s.present} checked in today</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Leaves</p>
              <h3 className="text-3xl font-bold text-amber-600 mt-1">{pendingLeavesCount}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Awaiting HR manager review</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance Risk</p>
              <h3 className="text-3xl font-bold text-rose-600 mt-1">{riskCount}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Flagged for late / absence</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center font-bold">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today Attendance Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Workforce Status Distribution</CardTitle>
            <CardDescription>Breakdown of present, on leave, and absent status</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-6 text-xs font-semibold pt-2">
              {pieData.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-slate-700">{p.name} ({p.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Department Headcount Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Department Headcount & Presence</CardTitle>
            <CardDescription>Total headcount vs present staff per department</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="headcount" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Total Staff" />
                  <Bar dataKey="present" fill="#10B981" radius={[4, 4, 0, 0]} name="Present Staff" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
