"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/useToast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { formatDate, formatCurrency } from "@/lib/format";
import { ArrowLeft, Save, Briefcase, Calendar, Clock, CreditCard, History } from "lucide-react";

interface EmployeeDetail {
  id: string;
  employeeId: string;
  loginId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  dateOfJoining: string | null;
  profilePic: string | null;
  role: "ADMIN" | "HR" | "EMPLOYEE";
  status: "ACTIVE" | "INACTIVE";
  paidLeaveBalance: number;
  sickLeaveBalance: number;
  basicSalary: number;
  hra: number;
  allowances: number;
  jobHistory?: Array<{
    id: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    reason: string;
    createdAt: string;
  }>;
}

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const employeeId = resolvedParams.id;
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "HR";

  const [isLoading, setIsLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);

  // Edit fields
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [role, setRole] = useState<"ADMIN" | "HR" | "EMPLOYEE">("EMPLOYEE");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadEmployee() {
      try {
        setIsLoading(true);
        const data = await apiFetch<EmployeeDetail>(`/api/employees/${employeeId}`);
        setEmployee(data);
        if (data) {
          setDepartment(data.department || "");
          setDesignation(data.designation || "");
          setRole(data.role || "EMPLOYEE");
          setStatus(data.status || "ACTIVE");
        }
      } catch {
        // Handle error
      } finally {
        setIsLoading(false);
      }
    }

    loadEmployee();
  }, [employeeId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error("A reason is required when modifying sensitive job details.", "Reason Required");
      return;
    }

    try {
      setIsSaving(true);
      const updated = await apiFetch<EmployeeDetail>(`/api/employees/${employeeId}`, {
        method: "PATCH",
        body: JSON.stringify({
          department,
          designation,
          role,
          status,
          reason,
        }),
      });

      toast.success("Employee job details updated & audit log recorded.", "Profile Updated");
      setEmployee(updated);
      setReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update employee", "Update Error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8 text-center">
        <h3 className="text-lg font-bold text-slate-800">Employee Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">The requested employee profile does not exist.</p>
        <Link href="/employees">
          <Button variant="outline">Back to Employee Directory</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-200">
      <div className="flex items-center gap-3">
        <Link href="/employees">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Directory
          </Button>
        </Link>
      </div>

      {/* Header Banner */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-2">
          <Avatar
            src={employee.profilePic}
            firstName={employee.firstName}
            lastName={employee.lastName}
            size="xl"
          />

          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {employee.firstName} {employee.lastName}
              </h2>
              <Badge variant={employee.status}>{employee.status}</Badge>
              <Badge variant="blue">{employee.role}</Badge>
            </div>

            <p className="text-xs font-semibold text-slate-500">
              {employee.designation || "Employee"} • {employee.department || "General"}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 pt-1">
              <span>Employee ID: <strong className="text-slate-700 font-mono">{employee.employeeId}</strong></span>
              <span>Login ID: <strong className="text-slate-700 font-mono">{employee.loginId || "N/A"}</strong></span>
              <span>Email: <strong className="text-slate-700">{employee.email}</strong></span>
            </div>
          </div>
        </div>
      </Card>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Job Form & Audit Trail */}
        <div className="lg:col-span-2 space-y-6">
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Edit Employment & Job Assignment</CardTitle>
                <CardDescription>
                  Modify department, designation, or status. Requires an audit log reason.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      required
                    />
                    <Input
                      label="Designation"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="Role"
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      options={[
                        { value: "EMPLOYEE", label: "Employee" },
                        { value: "HR", label: "HR Manager" },
                        { value: "ADMIN", label: "System Admin" },
                      ]}
                    />

                    <Select
                      label="Status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      options={[
                        { value: "ACTIVE", label: "Active" },
                        { value: "INACTIVE", label: "Inactive" },
                      ]}
                    />
                  </div>

                  <Input
                    label="Reason for Modification (Recorded in Audit Log)"
                    placeholder="e.g. Annual promotion / Transfer to engineering"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />

                  <div className="pt-2">
                    <Button type="submit" variant="primary" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
                      Update Employee Profile
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Job History Audit Trail */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Job Change History</CardTitle>
                <CardDescription>Immutable record of role and department changes</CardDescription>
              </div>
              <History className="w-4 h-4 text-slate-400" />
            </CardHeader>

            <CardContent>
              {!employee.jobHistory || employee.jobHistory.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No job changes recorded for this employee.</p>
              ) : (
                <div className="space-y-3 divide-y divide-slate-100 text-xs">
                  {employee.jobHistory.map((item) => (
                    <div key={item.id} className="pt-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 uppercase">Field Changed: {item.field}</span>
                        <span className="text-[10px] text-slate-400">{formatDate(item.createdAt)}</span>
                      </div>
                      <p className="text-slate-600">
                        From <code className="bg-slate-100 px-1 rounded">{item.oldValue || "None"}</code> to{" "}
                        <code className="bg-violet-50 text-violet-700 px-1 rounded font-semibold">{item.newValue}</code>
                      </p>
                      <p className="text-slate-500 italic">Reason: "{item.reason}"</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Leave Balances & Salary Snapshot */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Leave Balances</CardTitle>
              <CardDescription>Current available time-off quota</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-violet-900">Paid Leave</span>
                <span className="text-sm font-bold text-violet-700">{employee.paidLeaveBalance} days</span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-900">Sick Leave</span>
                <span className="text-sm font-bold text-emerald-700">{employee.sickLeaveBalance} days</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Salary & Benefits</CardTitle>
              <CardDescription>Monthly salary component breakdown</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Basic Salary</span>
                <span className="font-semibold text-slate-900">{formatCurrency(employee.basicSalary)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">HRA Allowance</span>
                <span className="font-semibold text-slate-900">{formatCurrency(employee.hra)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Special Allowances</span>
                <span className="font-semibold text-slate-900">{formatCurrency(employee.allowances)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 text-sm font-bold text-violet-600">
                <span>Calculated CTC / Wage</span>
                <span>{formatCurrency((employee.basicSalary || 0) * 2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
