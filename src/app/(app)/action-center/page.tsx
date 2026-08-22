"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Zap, Calendar, Clock, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

export default function ActionCenterPage() {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [riskItems, setRiskItems] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);

  useEffect(() => {
    async function loadActionCenter() {
      try {
        setIsLoading(true);

        try {
          const leaves = await apiFetch<any[]>("/api/leave/pending");
          setPendingLeaves(leaves || []);
        } catch {}

        try {
          const corrs = await apiFetch<any[]>("/api/attendance/corrections");
          setCorrections(corrs || []);
        } catch {}

        try {
          const risk = await apiFetch<any[]>("/api/attendance/risk");
          setRiskItems(risk || []);
        } catch {}

        try {
          const anom = await apiFetch<any[]>("/api/payroll/anomalies");
          setAnomalies(anom || []);
        } catch {}
      } finally {
        setIsLoading(false);
      }
    }

    loadActionCenter();
  }, [user]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const totalActions = pendingLeaves.length + corrections.length + riskItems.length + anomalies.length;

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-200">
      <PageHeader
        title="Operations Action Center"
        description="Unified management inbox for pending approvals, attendance corrections, and payroll alerts."
        badge={
          <Badge variant={totalActions > 0 ? "amber" : "green"} size="md">
            {totalActions > 0 ? `${totalActions} Action Items Requiring Attention` : "All Clear"}
          </Badge>
        }
      />

      {totalActions === 0 ? (
        <Card className="p-8 text-center bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 border border-emerald-100">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Your Action Center is Clear!</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            There are no pending leave requests, corrections, or payroll anomalies requiring your review.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Item 1: Pending Leaves */}
          <Card className="hover:border-amber-200 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Pending Leave Approvals</h3>
                  <p className="text-xs text-slate-500">{pendingLeaves.length} time-off requests awaiting decision</p>
                </div>
              </div>
              <Badge variant="amber">{pendingLeaves.length}</Badge>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Requires manager review & balance check</span>
              <Link href="/leave/approvals">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Go to Approvals Queue
                </Button>
              </Link>
            </div>
          </Card>

          {/* Item 2: Pending Attendance Corrections */}
          <Card className="hover:border-violet-200 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Attendance Corrections</h3>
                  <p className="text-xs text-slate-500">{corrections.length} manual check-in requests</p>
                </div>
              </div>
              <Badge variant="purple">{corrections.length}</Badge>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Review employee time adjustment reasons</span>
              <Link href="/attendance">
                <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Review Corrections
                </Button>
              </Link>
            </div>
          </Card>

          {/* Item 3: Attendance Risk Alerts */}
          <Card className="hover:border-rose-200 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Attendance Risk Flags</h3>
                  <p className="text-xs text-slate-500">{riskItems.length} employees flagged for frequent tardiness</p>
                </div>
              </div>
              <Badge variant="red">{riskItems.length}</Badge>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Inspect attendance risk analytics</span>
              <Link href="/attendance/risk">
                <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Inspect Risk Engine
                </Button>
              </Link>
            </div>
          </Card>

          {/* Item 4: Payroll Anomalies */}
          <Card className="hover:border-violet-200 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center font-bold">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Payroll Anomalies</h3>
                  <p className="text-xs text-slate-500">{anomalies.length} salary & deduction discrepancies</p>
                </div>
              </div>
              <Badge variant="purple">{anomalies.length}</Badge>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Verify monthly payroll calculations</span>
              <Link href="/payroll">
                <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Check Payroll Directory
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
