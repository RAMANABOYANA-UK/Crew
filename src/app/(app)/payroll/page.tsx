"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/format";
import { CreditCard, DollarSign, Download, CheckCircle2, AlertTriangle, FileText, ChevronRight } from "lucide-react";

interface PayrollData {
  id: string;
  employeeId: string;
  wage: number;
  basicSalary: number;
  hra: number;
  standardAllowance: number;
  performanceBonus: number;
  lta: number;
  fixedAllowance: number;
  pfEmployee: number;
  pfEmployer: number;
  professionalTax: number;
  netPayable: number;
  payableDays: number;
  totalWorkingDays: number;
  employee?: {
    firstName: string;
    lastName: string;
    employeeId: string;
    department: string;
    designation: string;
  };
}

export default function PayrollPage() {
  const { user } = useAuth();
  const isAdminOrHr = user?.role === "ADMIN" || user?.role === "HR";

  const [isLoading, setIsLoading] = useState(true);
  const [payrollList, setPayrollList] = useState<PayrollData[]>([]);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollData | null>(null);

  useEffect(() => {
    async function loadPayroll() {
      try {
        setIsLoading(true);
        const data = await apiFetch<PayrollData[]>("/api/payroll");
        setPayrollList(data || []);
        if (data && data.length > 0) {
          setSelectedPayroll(data[0]);
        }
      } catch {
        // Silently catch error
      } finally {
        setIsLoading(false);
      }
    }

    loadPayroll();
  }, [user]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <CardSkeleton />
      </div>
    );
  }

  const p = selectedPayroll;
  const grossSalary = (p?.basicSalary || 0) + (p?.hra || 0) + (p?.standardAllowance || 0) + (p?.performanceBonus || 0) + (p?.lta || 0) + (p?.fixedAllowance || 0);
  const totalDeductions = (p?.pfEmployee || 0) + (p?.professionalTax || 0);

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-200">
      <PageHeader
        title="Payroll & Compensation"
        description="View month salary breakdown, statutory deductions (PF & PT), and net payable statement."
      />

      {/* Main Payslip Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Payslip Breakdown Panel */}
        <div className="lg:col-span-2 space-y-6">
          {p ? (
            <Card className="border border-slate-200 shadow-md bg-white">
              {/* Payslip Header */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-100 p-2">
                <div>
                  <Badge variant="green" size="sm">CONFIDENTIAL PAYSLIP</Badge>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
                    Salary Slip — Current Cycle
                  </h2>
                  <p className="text-xs text-slate-500">
                    Employee: {p.employee ? `${p.employee.firstName} ${p.employee.lastName}` : user?.email} ({p.employee?.employeeId || "EMP001"})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Net Payable Amount</span>
                  <h3 className="text-2xl font-bold text-violet-600">{formatCurrency(p.netPayable)}</h3>
                </div>
              </div>

              {/* Working Days & Attendance Contribution */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 my-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block">Configured CTC / Wage</span>
                  <span className="font-bold text-slate-900">{formatCurrency(p.wage)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Working Days</span>
                  <span className="font-bold text-slate-900">{p.totalWorkingDays} days</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Payable Days</span>
                  <span className="font-bold text-emerald-600">{p.payableDays} days</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Attendance Factor</span>
                  <span className="font-bold text-violet-600">
                    {p.totalWorkingDays > 0 ? `${((p.payableDays / p.totalWorkingDays) * 100).toFixed(0)}%` : "100%"}
                  </span>
                </div>
              </div>

              {/* Earnings vs Deductions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Earnings Column */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Earnings Breakdown
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-600">Basic Salary</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(p.basicSalary)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-600">House Rent Allowance (HRA)</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(p.hra)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-600">Standard Allowance</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(p.standardAllowance)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-600">Performance Bonus</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(p.performanceBonus)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-600">Leave Travel Allowance (LTA)</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(p.lta)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-600">Special / Fixed Allowance</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(p.fixedAllowance)}</span>
                    </div>
                    <div className="flex justify-between pt-2 text-sm font-bold text-slate-900 border-t border-slate-200">
                      <span>Gross Earnings</span>
                      <span>{formatCurrency(grossSalary)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Column */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Deductions & Statutory
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-600">PF Employee Contribution (12%)</span>
                      <span className="font-semibold text-rose-600">-{formatCurrency(p.pfEmployee)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-600">Professional Tax (PT)</span>
                      <span className="font-semibold text-rose-600">-{formatCurrency(p.professionalTax)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50 text-slate-400">
                      <span>PF Employer Contribution (Statutory Info)</span>
                      <span>{formatCurrency(p.pfEmployer)}</span>
                    </div>
                    <div className="flex justify-between pt-10 text-sm font-bold text-rose-700 border-t border-slate-200">
                      <span>Total Deductions</span>
                      <span>-{formatCurrency(totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Payable Footer Banner */}
              <div className="mt-8 p-4 rounded-xl bg-violet-600 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-medium text-violet-200 uppercase tracking-wider block">Net Take-Home Pay</span>
                  <h3 className="text-2xl font-bold">{formatCurrency(p.netPayable)}</h3>
                </div>
                <Button variant="secondary" size="md" leftIcon={<Download className="w-4 h-4" />}>
                  Download Payslip PDF
                </Button>
              </div>
            </Card>
          ) : (
            <EmptyState
              icon={<CreditCard className="w-5 h-5 text-slate-400" />}
              title="No payroll record available"
              description="Payroll calculations will appear once configured by HR."
            />
          )}
        </div>

        {/* Right Column: Employee Selection List (HR/Admin) */}
        <div className="space-y-6">
          {isAdminOrHr && payrollList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Employee Payroll Directory</CardTitle>
                <CardDescription>Select an employee to inspect their payslip</CardDescription>
              </CardHeader>

              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {payrollList.map((item) => {
                    const isSelected = selectedPayroll?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedPayroll(item)}
                        className={`w-full text-left p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                          isSelected ? "bg-violet-50/60 border-l-4 border-violet-600" : ""
                        }`}
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-900">
                            {item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : item.employeeId}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">{item.employee?.employeeId}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-violet-600 block">{formatCurrency(item.netPayable)}</span>
                          <span className="text-[10px] text-slate-400">CTC: {formatCurrency(item.wage)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statutory Tax Rules Card */}
          <Card>
            <CardHeader>
              <CardTitle>Statutory Rules Summary</CardTitle>
              <CardDescription>Standard HRMS calculation rules applied</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 text-xs text-slate-600">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span>Basic Salary Ratio</span>
                <span className="font-semibold text-slate-900">50.00% of Wage</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span>HRA Allowance Ratio</span>
                <span className="font-semibold text-slate-900">50.00% of Basic</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span>Standard Allowance</span>
                <span className="font-semibold text-slate-900">₹4,167 / month</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span>PF Employee Contribution</span>
                <span className="font-semibold text-slate-900">12.00% of Basic</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Professional Tax (PT)</span>
                <span className="font-semibold text-slate-900">₹200 / month</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
