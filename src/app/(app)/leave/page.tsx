"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/useToast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { Calendar, Plus, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface LeaveRequestItem {
  id: string;
  leaveType: "PAID" | "SICK" | "CASUAL" | "UNPAID";
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminComment: string | null;
  createdAt: string;
}

export default function LeavePage() {
  const { user, refetchUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);

  // Apply Leave Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<"PAID" | "SICK" | "CASUAL" | "UNPAID">("PAID");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live total days calculation
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.max(0, end.getTime() - start.getTime());
  const calculatedDays = isNaN(diffTime) ? 0 : Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const paidBalance = user?.employee?.paidLeaveBalance ?? 12;
  const sickBalance = user?.employee?.sickLeaveBalance ?? 6;

  const availableBalance =
    leaveType === "PAID" || leaveType === "CASUAL"
      ? paidBalance
      : leaveType === "SICK"
      ? sickBalance
      : 999;

  const isInsufficient = calculatedDays > availableBalance;

  useEffect(() => {
    async function loadLeaveRequests() {
      try {
        setIsLoading(true);
        const data = await apiFetch<LeaveRequestItem[]>("/api/leave");
        setRequests(data || []);
      } catch {
        // Handle error silently
      } finally {
        setIsLoading(false);
      }
    }

    loadLeaveRequests();
  }, [user]);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error("Please provide a reason for your leave request.", "Validation Error");
      return;
    }

    if (calculatedDays <= 0) {
      toast.error("End date must be on or after start date.", "Invalid Dates");
      return;
    }

    if (isInsufficient) {
      toast.error("Insufficient leave balance for the requested dates.", "Insufficient Balance");
      return;
    }

    try {
      setIsSubmitting(true);
      const newReq = await apiFetch<LeaveRequestItem>("/api/leave", {
        method: "POST",
        body: JSON.stringify({
          leaveType,
          startDate,
          endDate,
          reason,
        }),
      });

      toast.success("Leave request submitted for approval.", "Submitted");
      setRequests((prev) => [newReq, ...prev]);
      setModalOpen(false);
      setReason("");
      await refetchUser();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit leave request", "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-200">
      <PageHeader
        title="Leave & Time-Off Management"
        description="Apply for time-off, check live leave balances, and track approval status."
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Apply New Leave
          </Button>
        }
      />

      {/* Leave Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-white to-violet-50/30 border border-violet-100">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-violet-700 uppercase tracking-wider">Paid / Casual Leave</span>
              <h3 className="text-3xl font-bold text-violet-950 mt-1">{paidBalance}</h3>
              <p className="text-xs text-violet-600 mt-1">days remaining this annual cycle</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-sm shadow-xs">
              PAL
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-white to-emerald-50/30 border border-emerald-100">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Sick Leave</span>
              <h3 className="text-3xl font-bold text-emerald-950 mt-1">{sickBalance}</h3>
              <p className="text-xs text-emerald-600 mt-1">days remaining for medical leave</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm shadow-xs">
              SCL
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-white to-slate-50 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Unpaid Leave</span>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">Available</h3>
              <p className="text-xs text-slate-500 mt-1">subject to manager approval</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-200/70 text-slate-700 font-bold flex items-center justify-center text-sm shadow-xs">
              UPL
            </div>
          </div>
        </Card>
      </div>

      {/* My Leave Requests Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>My Leave Request History</CardTitle>
            <CardDescription>Status history of all time-off submissions</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : requests.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-5 h-5 text-slate-400" />}
              title="No leave requests filed"
              description="Click 'Apply New Leave' to request time off."
              action={
                <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
                  Apply Leave Now
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="p-3">Type</th>
                    <th className="p-3">Start Date</th>
                    <th className="p-3">End Date</th>
                    <th className="p-3">Days</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Admin Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">{req.leaveType}</td>
                      <td className="p-3 text-slate-700">{formatDate(req.startDate)}</td>
                      <td className="p-3 text-slate-700">{formatDate(req.endDate)}</td>
                      <td className="p-3 font-semibold text-violet-600">{req.totalDays} day{req.totalDays > 1 ? "s" : ""}</td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{req.reason}</td>
                      <td className="p-3">
                        <Badge variant={req.status}>{req.status}</Badge>
                      </td>
                      <td className="p-3 text-slate-500 italic max-w-xs truncate">{req.adminComment || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Apply for Leave / Time-Off"
        description="Submit a leave request for manager review"
      >
        <form onSubmit={handleSubmitLeave} className="space-y-4">
          <Select
            label="Leave Type"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value as any)}
            options={[
              { value: "PAID", label: "Paid Leave (PAL)" },
              { value: "SICK", label: "Sick Leave (SCL)" },
              { value: "CASUAL", label: "Casual Leave (CSL)" },
              { value: "UNPAID", label: "Unpaid Leave (UPL)" },
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">Calculated Total Days:</span>
            <span className="font-bold text-violet-600 text-sm">{calculatedDays} day(s)</span>
          </div>

          {isInsufficient && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Insufficient balance ({availableBalance} days available).</span>
            </div>
          )}

          <Input
            label="Reason for Leave"
            placeholder="Explain why you are requesting leave..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isSubmitting}
              disabled={isInsufficient || calculatedDays <= 0}
            >
              Submit Leave Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
