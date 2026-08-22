"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/useToast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate, formatCurrency } from "@/lib/format";
import { User, Briefcase, CreditCard, Shield, Camera, Save, Lock } from "lucide-react";

export default function ProfilePage() {
  const { user, refetchUser } = useAuth();

  const [activeTab, setActiveTab] = useState<"personal" | "job" | "salary" | "security">("personal");

  const [phone, setPhone] = useState(user?.employee?.phone || "");
  const [address, setAddress] = useState("");
  const [profilePic, setProfilePic] = useState(user?.employee?.profilePic || "");
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;
  const emp = user.employee;

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          phone: phone || undefined,
          address: address || undefined,
          profilePic: profilePic || undefined,
        }),
      });
      toast.success("Your profile details have been updated.", "Profile Saved");
      await refetchUser();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile", "Update Error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-200">
      <PageHeader
        title="My Profile"
        description="Manage your personal information, employment details, and security settings."
      />

      {/* Top Overview Banner */}
      <Card className="border border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-2">
          <div className="relative group">
            <Avatar
              src={profilePic || emp?.profilePic}
              firstName={emp?.firstName || user.email}
              lastName={emp?.lastName}
              size="xl"
            />
          </div>

          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {emp ? `${emp.firstName} ${emp.lastName}` : user.email}
              </h2>
              <Badge variant="ACTIVE">{emp?.status || "ACTIVE"}</Badge>
              <Badge variant="blue">{user.role}</Badge>
            </div>

            <p className="text-xs font-medium text-slate-500">
              {emp?.designation || "Employee"} • {emp?.department || "General"}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 pt-1">
              <span>Employee ID: <strong className="text-slate-700 font-mono">{emp?.employeeId || "N/A"}</strong></span>
              <span>Login ID: <strong className="text-slate-700 font-mono">{user.loginId || "N/A"}</strong></span>
              <span>Email: <strong className="text-slate-700">{user.email}</strong></span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab("personal")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
            activeTab === "personal"
              ? "border-violet-600 text-violet-600 bg-violet-50/50"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <User className="w-4 h-4" /> Personal Info
        </button>

        <button
          onClick={() => setActiveTab("job")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
            activeTab === "job"
              ? "border-violet-600 text-violet-600 bg-violet-50/50"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Briefcase className="w-4 h-4" /> Job & Org Details
        </button>

        <button
          onClick={() => setActiveTab("salary")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
            activeTab === "salary"
              ? "border-violet-600 text-violet-600 bg-violet-50/50"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <CreditCard className="w-4 h-4" /> Salary & Benefits
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
            activeTab === "security"
              ? "border-violet-600 text-violet-600 bg-violet-50/50"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Shield className="w-4 h-4" /> Security
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === "personal" && (
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>Update your contact phone number, address, and profile image URL.</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSavePersonal} className="space-y-4 max-w-xl">
                <Input
                  label="Phone Number"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <Input
                  label="Profile Picture URL"
                  placeholder="https://example.com/photo.jpg"
                  value={profilePic}
                  onChange={(e) => setProfilePic(e.target.value)}
                  helperText="Provide a direct URL to your profile avatar image"
                />

                <Input
                  label="Residential Address"
                  placeholder="Street address, city, state, pincode"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />

                <div className="pt-2">
                  <Button type="submit" variant="primary" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "job" && (
          <Card>
            <CardHeader>
              <CardTitle>Employment & Organization</CardTitle>
              <CardDescription>Read-only job specifications maintained by HR & Management.</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl text-xs">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold block">Employee Serial ID</span>
                  <span className="font-mono text-sm text-slate-900 font-bold">{emp?.employeeId || "EMP001"}</span>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold block">System Login ID</span>
                  <span className="font-mono text-sm text-slate-900 font-bold">{user.loginId || "N/A"}</span>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold block">Department</span>
                  <span className="text-sm text-slate-900 font-semibold">{emp?.department || "General"}</span>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold block">Designation</span>
                  <span className="text-sm text-slate-900 font-semibold">{emp?.designation || "Team Member"}</span>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold block">System Role</span>
                  <span className="text-sm text-slate-900 font-semibold">{user.role}</span>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold block">Employment Status</span>
                  <span className="text-sm text-slate-900 font-semibold">{emp?.status || "ACTIVE"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "salary" && (
          <Card>
            <CardHeader>
              <CardTitle>Salary & Statutory Structure</CardTitle>
              <CardDescription>Compensation details and statutory deductions configuration.</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
                <div className="p-4 rounded-xl bg-violet-50/50 border border-violet-100">
                  <span className="text-xs font-semibold text-violet-700 uppercase tracking-wider block">Basic Salary</span>
                  <h4 className="text-xl font-bold text-violet-950 mt-1">{formatCurrency(emp?.basicSalary || 50000)}</h4>
                  <span className="text-[11px] text-violet-600 mt-1 block">50% of Total Wage</span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">House Rent Allowance (HRA)</span>
                  <h4 className="text-xl font-bold text-emerald-950 mt-1">{formatCurrency(emp?.hra || 25000)}</h4>
                  <span className="text-[11px] text-emerald-600 mt-1 block">50% of Basic Salary</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-100/50 border border-slate-200/60">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">Special Allowances</span>
                  <h4 className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(emp?.allowances || 10000)}</h4>
                  <span className="text-[11px] text-slate-500 mt-1 block">Flexible component</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "security" && (
          <Card>
            <CardHeader>
              <CardTitle>Account Security & Password</CardTitle>
              <CardDescription>Manage your authentication credentials and session security.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-xs text-slate-600 max-w-md">
                It is recommended to update your password regularly to keep your employee portal and salary details secure.
              </p>

              <div>
                <a href="/change-password">
                  <Button variant="outline" leftIcon={<Lock className="w-4 h-4" />}>
                    Change Password Page →
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
