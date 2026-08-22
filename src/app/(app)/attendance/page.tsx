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
import { Modal } from "@/components/ui/Modal";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatTime, formatHours } from "@/lib/format";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileEdit,
  Search,
  Check,
  X,
} from "lucide-react";

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE";
  hoursWorked: number | null;
  notes: string | null;
  employee?: {
    firstName: string;
    lastName: string;
    employeeId: string;
    department: string;
  };
}

interface CorrectionItem {
  id: string;
  employeeId: string;
  date: string;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  employee?: {
    firstName: string;
    lastName: string;
    employeeId: string;
  };
}

export default function AttendancePage() {
  const { user } = useAuth();
  const isAdminOrHr = user?.role === "ADMIN" || user?.role === "HR";

  const [activeTab, setActiveTab] = useState<"my" | "all" | "corrections">("my");

  const [isLoading, setIsLoading] = useState(true);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [corrections, setCorrections] = useState<CorrectionItem[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);

  // Check In/Out Loading
  const [isCheckInLoading, setIsCheckInLoading] = useState(false);
  const [isCheckOutLoading, setIsCheckOutLoading] = useState(false);

  // Correction Request Modal State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionDate, setCorrectionDate] = useState(new Date().toISOString().split("T")[0]);
  const [correctionCheckIn, setCorrectionCheckIn] = useState("09:00");
  const [correctionCheckOut, setCorrectionCheckOut] = useState("17:30");
  const [correctionReason, setCorrectionReason] = useState("");
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  // Review Correction Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedCorrection, setSelectedCorrection] = useState<CorrectionItem | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    async function loadAttendanceData() {
      try {
        setIsLoading(true);

        // Fetch Today Attendance
        try {
          const today = await apiFetch<AttendanceRecord>("/api/attendance/today");
          setTodayRecord(today);
        } catch {}

        // Fetch Attendance List
        const list = await apiFetch<AttendanceRecord[]>("/api/attendance");
        setAttendances(list || []);

        // If HR/Admin, fetch corrections queue
        if (isAdminOrHr) {
          try {
            const corrList = await apiFetch<CorrectionItem[]>("/api/attendance/corrections");
            setCorrections(corrList || []);
          } catch {}
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadAttendanceData();
  }, [user, isAdminOrHr]);

  const handleCheckIn = async () => {
    try {
      setIsCheckInLoading(true);
      const res = await apiFetch<AttendanceRecord>("/api/attendance/check-in", { method: "POST" });
      toast.success("Checked in successfully!", "Clocked In");
      setTodayRecord(res);
      setAttendances((prev) => [res, ...prev.filter((a) => a.id !== res.id)]);
    } catch (err: any) {
      toast.error(err.message || "Failed to check in", "Error");
    } finally {
      setIsCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setIsCheckOutLoading(true);
      const res = await apiFetch<AttendanceRecord>("/api/attendance/check-out", { method: "POST" });
      toast.success("Checked out successfully!", "Clocked Out");
      setTodayRecord(res);
      setAttendances((prev) => [res, ...prev.filter((a) => a.id !== res.id)]);
    } catch (err: any) {
      toast.error(err.message || "Failed to check out", "Error");
    } finally {
      setIsCheckOutLoading(false);
    }
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionReason.trim()) {
      toast.error("Please provide a reason for the attendance correction request.", "Validation Error");
      return;
    }

    try {
      setIsSubmittingCorrection(true);
      await apiFetch("/api/attendance/corrections", {
        method: "POST",
        body: JSON.stringify({
          date: correctionDate,
          requestedCheckIn: `${correctionDate}T${correctionCheckIn}:00.000Z`,
          requestedCheckOut: `${correctionDate}T${correctionCheckOut}:00.000Z`,
          reason: correctionReason,
        }),
      });

      toast.success("Attendance correction request submitted to HR.", "Request Submitted");
      setCorrectionModalOpen(false);
      setCorrectionReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit correction request", "Submission Error");
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  const handleReviewCorrection = async (action: "APPROVED" | "REJECTED") => {
    if (!selectedCorrection) return;

    try {
      setIsReviewing(true);
      await apiFetch(`/api/attendance/corrections/${selectedCorrection.id}/review`, {
        method: "PATCH",
        body: JSON.stringify({
          status: action,
          adminComment: adminComment || undefined,
        }),
      });

      toast.success(`Correction request ${action.toLowerCase()} successfully.`, "Status Updated");
      setCorrections((prev) => prev.filter((c) => c.id !== selectedCorrection.id));
      setReviewModalOpen(false);
      setSelectedCorrection(null);
      setAdminComment("");
    } catch (err: any) {
      toast.error(err.message || "Failed to review correction request", "Review Error");
    } finally {
      setIsReviewing(false);
    }
  };

  const isCheckedIn = Boolean(todayRecord?.checkIn);
  const isCheckedOut = Boolean(todayRecord?.checkOut);

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-200">
      <PageHeader
        title="Attendance & Time Logs"
        description="Track daily check-ins, shift hours, attendance history, and correction requests."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCorrectionModalOpen(true)}
            leftIcon={<FileEdit className="w-4 h-4 text-violet-600" />}
          >
            Request Attendance Correction
          </Button>
        }
      />

      {/* Check In / Check Out Card Banner */}
      <Card className="border border-violet-100 bg-gradient-to-r from-white via-slate-50/50 to-violet-50/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={isCheckedOut ? "gray" : isCheckedIn ? "PRESENT" : "amber"}>
                {isCheckedOut ? "Shift Completed" : isCheckedIn ? "Currently Clocked In" : "Not Checked In"}
              </Badge>
              <span className="text-xs text-slate-400">Today: {formatDate(new Date())}</span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {isCheckedOut ? "Shift Finished" : isCheckedIn ? "Active Shift in Progress" : "Start Shift"}
            </h2>

            <div className="flex items-center gap-6 text-xs text-slate-600 pt-1">
              <div>
                <span className="text-slate-400 block">Check In:</span>
                <span className="font-semibold text-slate-800">{formatTime(todayRecord?.checkIn)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Check Out:</span>
                <span className="font-semibold text-slate-800">{formatTime(todayRecord?.checkOut)}</span>
              </div>
              {todayRecord?.hoursWorked !== undefined && todayRecord?.hoursWorked !== null && (
                <div>
                  <span className="text-slate-400 block">Duration:</span>
                  <span className="font-semibold text-violet-600">{formatHours(todayRecord.hoursWorked)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex sm:flex-col gap-3 shrink-0">
            {!isCheckedIn ? (
              <Button
                variant="primary"
                size="lg"
                onClick={handleCheckIn}
                isLoading={isCheckInLoading}
                leftIcon={<LogIn className="w-4 h-4" />}
              >
                Clock In
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
                Clock Out
              </Button>
            ) : (
              <Button variant="secondary" size="lg" disabled leftIcon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}>
                Shift Completed
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* HR/Admin Navigation Tabs */}
      {isAdminOrHr && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
          <button
            onClick={() => setActiveTab("my")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
              activeTab === "my"
                ? "border-violet-600 text-violet-600 bg-violet-50/50"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            My Attendance
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
              activeTab === "all"
                ? "border-violet-600 text-violet-600 bg-violet-50/50"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            All Employees Logs
          </button>
          <button
            onClick={() => setActiveTab("corrections")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "corrections"
                ? "border-violet-600 text-violet-600 bg-violet-50/50"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>Corrections Queue</span>
            {corrections.length > 0 && (
              <Badge variant="amber" size="sm">
                {corrections.length}
              </Badge>
            )}
          </button>
        </div>
      )}

      {/* Attendance History Table */}
      {activeTab !== "corrections" ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>{activeTab === "all" ? "All Employee Attendance Records" : "My Attendance History"}</CardTitle>
              <CardDescription>Chronological log of shift check-ins, check-outs, and hours worked</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={5} />
            ) : attendances.length === 0 ? (
              <EmptyState
                icon={<Clock className="w-5 h-5 text-slate-400" />}
                title="No attendance records found"
                description="Check-in today to create your first attendance record."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider">
                      {activeTab === "all" && <th className="p-3">Employee</th>}
                      <th className="p-3">Date</th>
                      <th className="p-3">Check In</th>
                      <th className="p-3">Check Out</th>
                      <th className="p-3">Hours</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {attendances.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        {activeTab === "all" && (
                          <td className="p-3 font-semibold text-slate-900">
                            {rec.employee ? `${rec.employee.firstName} ${rec.employee.lastName}` : rec.employeeId}
                          </td>
                        )}
                        <td className="p-3 font-semibold text-slate-900">{formatDate(rec.date)}</td>
                        <td className="p-3 text-slate-700">{formatTime(rec.checkIn)}</td>
                        <td className="p-3 text-slate-700">{formatTime(rec.checkOut)}</td>
                        <td className="p-3 font-semibold text-violet-600">{formatHours(rec.hoursWorked)}</td>
                        <td className="p-3">
                          <Badge variant={rec.status}>{rec.status}</Badge>
                        </td>
                        <td className="p-3 text-slate-500 italic max-w-xs truncate">{rec.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Corrections Queue Tab */
        <Card>
          <CardHeader>
            <CardTitle>Attendance Corrections Review Queue</CardTitle>
            <CardDescription>Requests submitted by employees for missed or manual check-ins</CardDescription>
          </CardHeader>

          <CardContent>
            {corrections.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                title="No pending correction requests"
                description="All attendance correction requests have been reviewed!"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="p-3">Employee</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Requested In</th>
                      <th className="p-3">Requested Out</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {corrections.map((corr) => (
                      <tr key={corr.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-semibold text-slate-900">
                          {corr.employee ? `${corr.employee.firstName} ${corr.employee.lastName}` : corr.employeeId}
                        </td>
                        <td className="p-3 text-slate-700">{formatDate(corr.date)}</td>
                        <td className="p-3 text-slate-700">{formatTime(corr.requestedCheckIn)}</td>
                        <td className="p-3 text-slate-700">{formatTime(corr.requestedCheckOut)}</td>
                        <td className="p-3 text-slate-600 max-w-xs truncate">{corr.reason}</td>
                        <td className="p-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCorrection(corr);
                              setReviewModalOpen(true);
                            }}
                          >
                            Review Request
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Request Correction Modal */}
      <Modal
        isOpen={correctionModalOpen}
        onClose={() => setCorrectionModalOpen(false)}
        title="Request Attendance Correction"
        description="Submit manual check-in/out times for approval by HR"
      >
        <form onSubmit={handleCorrectionSubmit} className="space-y-4">
          <Input
            label="Target Date"
            type="date"
            value={correctionDate}
            onChange={(e) => setCorrectionDate(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Requested Check-In"
              type="time"
              value={correctionCheckIn}
              onChange={(e) => setCorrectionCheckIn(e.target.value)}
              required
            />
            <Input
              label="Requested Check-Out"
              type="time"
              value={correctionCheckOut}
              onChange={(e) => setCorrectionCheckOut(e.target.value)}
              required
            />
          </div>

          <Input
            label="Reason for Correction"
            placeholder="e.g. Forgot to clock out / System maintenance"
            value={correctionReason}
            onChange={(e) => setCorrectionReason(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setCorrectionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmittingCorrection}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review Correction Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Review Attendance Correction Request"
      >
        {selectedCorrection && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
              <p className="font-semibold text-slate-900">
                Employee: {selectedCorrection.employee ? `${selectedCorrection.employee.firstName} ${selectedCorrection.employee.lastName}` : selectedCorrection.employeeId}
              </p>
              <p className="text-slate-600">Date: {formatDate(selectedCorrection.date)}</p>
              <p className="text-slate-600">
                Requested Times: {formatTime(selectedCorrection.requestedCheckIn)} - {formatTime(selectedCorrection.requestedCheckOut)}
              </p>
              <p className="text-slate-700 font-medium italic pt-1">"{selectedCorrection.reason}"</p>
            </div>

            <Input
              label="Review Note / Admin Comment (Optional)"
              placeholder="Provide reason or approval notes"
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="danger"
                onClick={() => handleReviewCorrection("REJECTED")}
                isLoading={isReviewing}
                leftIcon={<X className="w-4 h-4" />}
              >
                Reject Request
              </Button>
              <Button
                variant="primary"
                onClick={() => handleReviewCorrection("APPROVED")}
                isLoading={isReviewing}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Approve & Update Log
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
