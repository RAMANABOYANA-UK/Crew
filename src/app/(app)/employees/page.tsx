"use client";

import React, { useState, useEffect } from "react";
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
import { Modal } from "@/components/ui/Modal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/format";
import { Users, UserPlus, Search, Filter, ChevronRight, CheckCircle, Copy, Key } from "lucide-react";

interface EmployeeItem {
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
  basicSalary: number;
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "HR";

  const [isLoading, setIsLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  // Create Employee Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [designation, setDesignation] = useState("Software Engineer");
  const [role, setRole] = useState<"EMPLOYEE" | "HR" | "ADMIN">("EMPLOYEE");
  const [basicSalary, setBasicSalary] = useState("50000");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success result modal state
  const [createdUserResult, setCreatedUserResult] = useState<{
    loginId: string;
    employeeId: string;
    temporaryPassword: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    async function loadEmployees() {
      try {
        setIsLoading(true);
        const queryParams = new URLSearchParams();
        if (search) queryParams.set("search", search);
        if (departmentFilter) queryParams.set("department", departmentFilter);

        const data = await apiFetch<EmployeeItem[]>(`/api/employees?${queryParams.toString()}`);
        setEmployees(data || []);
      } catch {
        // Silently catch error
      } finally {
        setIsLoading(false);
      }
    }

    loadEmployees();
  }, [user, search, departmentFilter]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      const res = await apiFetch<{
        user: { loginId: string; email: string };
        employee: EmployeeItem;
        temporaryPassword: string;
      }>("/api/employees", {
        method: "POST",
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          department,
          designation,
          role,
          basicSalary: parseFloat(basicSalary) || 50000,
        }),
      });

      toast.success(`Provisioned employee account for ${firstName} ${lastName}`, "Account Provisioned");
      setEmployees((prev) => [res.employee, ...prev]);

      setCreatedUserResult({
        loginId: res.user.loginId,
        employeeId: res.employee.employeeId,
        temporaryPassword: res.temporaryPassword,
        email: res.user.email,
      });

      setModalOpen(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
    } catch (err: any) {
      toast.error(err.message || "Failed to provision employee account", "Provisioning Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!", "Copied");
  };

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-200">
      <PageHeader
        title="Employee Directory"
        description="Search, view profiles, and provision employee accounts for your organization."
        action={
          isAdmin ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setModalOpen(true)}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Provision New Employee
            </Button>
          ) : undefined
        }
      />

      {/* Filters Bar */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-1">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Input
              placeholder="Search by name, email, or Login ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              className="w-full sm:w-72"
            />

            <Select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              options={[
                { value: "", label: "All Departments" },
                { value: "Engineering", label: "Engineering" },
                { value: "Human Resources", label: "Human Resources" },
                { value: "Product & Design", label: "Product & Design" },
                { value: "Marketing", label: "Marketing" },
                { value: "Quality Assurance", label: "Quality Assurance" },
                { value: "Executive", label: "Executive" },
              ]}
              className="w-48"
            />
          </div>

          <Badge variant="purple" size="md">
            {employees.length} Employee{employees.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </Card>

      {/* Employees Directory Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Organization Roster</CardTitle>
          <CardDescription>Click any row to inspect full profile, attendance history, and salary details</CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : employees.length === 0 ? (
            <EmptyState
              icon={<Users className="w-5 h-5 text-slate-400" />}
              title="No employees found"
              description="Try adjusting your search query or department filter."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="p-3">Employee</th>
                    <th className="p-3">Login ID</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Designation</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={emp.profilePic} firstName={emp.firstName} lastName={emp.lastName} size="sm" />
                          <div>
                            <p className="font-bold text-slate-900">{emp.firstName} {emp.lastName}</p>
                            <p className="text-[10px] text-slate-400">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono font-semibold text-slate-800">{emp.loginId || "N/A"}</td>
                      <td className="p-3 text-slate-700">{emp.department || "General"}</td>
                      <td className="p-3 text-slate-700">{emp.designation || "Team Member"}</td>
                      <td className="p-3">
                        <Badge variant={emp.role === "ADMIN" ? "red" : emp.role === "HR" ? "amber" : "blue"}>
                          {emp.role}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={emp.status}>{emp.status}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Link href={`/employees/${emp.id}`}>
                          <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                            View Profile
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provision Employee Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Provision New Employee Account"
        description="Creates system credentials and generates employee sequence ID"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              placeholder="e.g. Rajesh"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Last Name"
              placeholder="e.g. Kumar"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <Input
            label="Corporate Email Address"
            type="email"
            placeholder="rajesh.kumar@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Phone Number (Optional)"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

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
              label="System Role"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              options={[
                { value: "EMPLOYEE", label: "Employee" },
                { value: "HR", label: "HR Manager" },
                { value: "ADMIN", label: "System Admin" },
              ]}
            />

            <Input
              label="Basic Salary (₹)"
              type="number"
              value={basicSalary}
              onChange={(e) => setBasicSalary(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Provision Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Account Provisioned Success Result Modal */}
      {createdUserResult && (
        <Modal
          isOpen={Boolean(createdUserResult)}
          onClose={() => setCreatedUserResult(null)}
          title="Employee Account Created!"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <h4 className="text-sm font-bold">Credentials Provisioned Successfully</h4>
              </div>
              <p className="text-emerald-800">
                Share these initial credentials with the employee. They will be forced to change password on first login.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Employee ID:</span>
                <span className="font-bold text-violet-400">{createdUserResult.employeeId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Login ID:</span>
                <span className="font-bold text-emerald-400">{createdUserResult.loginId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Temp Password:</span>
                <span className="font-bold text-amber-400">{createdUserResult.temporaryPassword}</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  copyToClipboard(
                    `Login ID: ${createdUserResult.loginId}\nTemp Password: ${createdUserResult.temporaryPassword}`
                  );
                  setCreatedUserResult(null);
                }}
                leftIcon={<Copy className="w-4 h-4" />}
              >
                Copy Credentials & Dismiss
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
