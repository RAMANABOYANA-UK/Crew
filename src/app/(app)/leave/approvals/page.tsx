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
import { CheckSquare, Check, X, Search, CheckCircle2 } from "lucide-react";

interface PendingLeaveItem {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department: string;
    designation: string;
  };
}

export default function LeaveApprovalsPage() {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<PendingLeaveItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("PENDING");
  const [search, setSearch] = useState("");

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<PendingLeaveItem | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [adminComment, setAdminComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadApprovals() {
      try {
        setIsLoading(true);
        const data = await apiFetch<PendingLeaveItem[]>(
          filterStatus === "PENDING" ? "/api/leave/pending" : "/api/leave/all"
        );
        setRequests(data || []);
      } catch {
        // Handle error silently
      } finally {
        setIsLoading(false);
      }
    }

    loadApprovals();
  }, [user, filterStatus]);

  const handleOpenReview = (req: PendingLeaveItem, action: "APPROVED" | "REJECTED") => {
    setSelectedReq(req);
    setReviewAction(action);
    setAdminComment("");
    setReviewModalOpen(true);
  };

  const handleReviewSubmit = async () => {
    if (!selectedReq) return;

    if (reviewAction === "REJECTED" && !adminComment.trim()) {
      toast.error("Please provide a reason / comment when rejecting a leave request.", "Comment Required");
      return;
    }

    try {
      setIsSubmitting(true);
      await apiFetch(`/api/leave/${selectedReq.id}/review`, {
        method: "PATCH",
        body: JSON.stringify({
          status: reviewAction,
          adminComment: adminComment || undefined,
        }),
      });

      toast.success(
        `Leave request for ${selectedReq.employee.firstName} ${selectedReq.employee.lastName} has been ${reviewAction.toLowerCase()}.`,
        "Leave Reviewed"
      );

      setRequests((prev) => prev.filter((r) => r.id !== selectedReq.id));
      setReviewModalOpen(false);
      setSelectedReq(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to process review action", "Review Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const name = `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase()) || r.employee.employeeId?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-200">
      <PageHeader
        title="Leave Approvals Queue"
        description="Review, approve, or reject leave submissions with balance validation and attendance auto-sync."
      />

      {/* Filters Bar */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-1">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: "PENDING", label: "Pending Approvals Only" },
                { value: "ALL", label: "All Historical Requests" },
              ]}
              className="w-48"
            />

            <Input
              placeholder="Search employee name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              className="w-full sm:w-64"
            />
          </div>

          <Badge variant="purple" size="md">
            {filteredRequests.length} Request{filteredRequests.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </Card>

      {/* Approvals Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Leave Submissions Queue</CardTitle>
          <CardDescription>Click Approve or Reject to process employee time-off requests</CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              title="No pending leave approvals"
              description="All leave requests in this view have been processed."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="p-3">Employee</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Leave Type</th>
                    <th className="p-3">Dates</th>
                    <th className="p-3">Days</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-slate-900">{req.employee.firstName} {req.employee.lastName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{req.employee.employeeId}</p>
                      </td>
                      <td className="p-3 text-slate-700">{req.employee.department || "General"}</td>
                      <td className="p-3 font-semibold text-slate-900">{req.leaveType}</td>
                      <td className="p-3 text-slate-700">
                        {formatDate(req.startDate)} - {formatDate(req.endDate)}
                      </td>
                      <td className="p-3 font-semibold text-violet-600">{req.totalDays} day{req.totalDays > 1 ? "s" : ""}</td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{req.reason}</td>
                      <td className="p-3">
                        <Badge variant={req.status}>{req.status}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        {req.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReview(req, "REJECTED")}
                              className="text-rose-600 border-rose-200 hover:bg-rose-50"
                              leftIcon={<X className="w-3.5 h-3.5" />}
                            >
                              Reject
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenReview(req, "APPROVED")}
                              leftIcon={<Check className="w-3.5 h-3.5" />}
                            >
                              Approve
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={`${reviewAction === "APPROVED" ? "Approve" : "Reject"} Leave Request`}
      >
        {selectedReq && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
              <p className="font-semibold text-slate-900">
                Employee: {selectedReq.employee.firstName} {selectedReq.employee.lastName} ({selectedReq.employee.employeeId})
              </p>
              <p className="text-slate-600">
                Type: {selectedReq.leaveType} • Duration: {selectedReq.totalDays} day(s) ({formatDate(selectedReq.startDate)} - {formatDate(selectedReq.endDate)})
              </p>
              <p className="text-slate-700 italic pt-1 font-medium">"{selectedReq.reason}"</p>
            </div>

            <Input
              label={`Admin Review Note ${reviewAction === "REJECTED" ? "(Required)" : "(Optional)"}`}
              placeholder="Provide approval notes or rejection reason"
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              required={reviewAction === "REJECTED"}
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={reviewAction === "APPROVED" ? "primary" : "danger"}
                onClick={handleReviewSubmit}
                isLoading={isSubmitting}
              >
                Confirm {reviewAction}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
