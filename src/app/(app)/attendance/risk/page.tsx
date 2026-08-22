"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

interface RiskEmployee {
  employeeId: string;
  employeeName: string;
  department: string;
  riskLevel: "MEDIUM" | "HIGH";
  reason: string;
  lateCheckInsCount: number;
  unexcusedAbsencesCount: number;
}

export default function AttendanceRiskPage() {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [riskList, setRiskList] = useState<RiskEmployee[]>([]);

  useEffect(() => {
    async function loadRiskData() {
      try {
        setIsLoading(true);
        const data = await apiFetch<RiskEmployee[]>("/api/attendance/risk");
        setRiskList(data || []);
      } catch {
        // Silently catch error
      } finally {
        setIsLoading(false);
      }
    }

    loadRiskData();
  }, [user]);

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-200">
      <PageHeader
        title="Attendance Risk Engine"
        description="Automated risk analysis flagging employees with pattern tardiness or unexcused absences."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Flagged Employees & Risk Assessment</CardTitle>
          <CardDescription>Risk engine flags employees based on historical shift attendance logs</CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={4} />
          ) : riskList.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-6 h-6 text-emerald-500" />}
              title="No attendance risk flags"
              description="No employees are currently flagged for tardiness or unexcused absences!"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="p-3">Employee</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Risk Severity</th>
                    <th className="p-3">Late Check-Ins</th>
                    <th className="p-3">Unexcused Absences</th>
                    <th className="p-3">Primary Risk Trigger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {riskList.map((item) => (
                    <tr key={item.employeeId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{item.employeeName}</td>
                      <td className="p-3 text-slate-700">{item.department || "General"}</td>
                      <td className="p-3">
                        <Badge variant={item.riskLevel === "HIGH" ? "red" : "amber"}>
                          {item.riskLevel} RISK
                        </Badge>
                      </td>
                      <td className="p-3 font-semibold text-amber-600">{item.lateCheckInsCount || 0} times</td>
                      <td className="p-3 font-semibold text-rose-600">{item.unexcusedAbsencesCount || 0} days</td>
                      <td className="p-3 text-slate-600 italic">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
