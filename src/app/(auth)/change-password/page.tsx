"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/useToast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { ToastContainer } from "@/components/ui/Toast";
import { Lock, CheckCircle, AlertCircle, KeyRound, ShieldCheck } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isMinLength = newPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isDifferent = currentPassword !== newPassword && newPassword.length > 0;
  const isMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const isValid = isMinLength && hasLetter && hasNumber && isDifferent && isMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    try {
      setIsLoading(true);
      setErrorMsg(null);

      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      toast.success("Your password has been updated successfully.", "Security Updated");
      router.push("/dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update password. Please verify current password.");
      toast.error(err.message || "Update failed", "Error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 antialiased">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white mx-auto flex items-center justify-center font-bold text-2xl shadow-lg shadow-amber-500/30">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security Update Required</h1>
          <p className="text-xs text-slate-500 font-medium">
            Please update your temporary password before accessing Dayflow HRMS
          </p>
        </div>

        <Card className="border border-slate-200/80 shadow-md">
          <CardHeader className="text-center pb-2">
            <CardTitle>Set Your New Password</CardTitle>
            <CardDescription>Choose a strong password with at least 8 characters</CardDescription>
          </CardHeader>

          <CardContent>
            {errorMsg && (
              <div className="p-3.5 mb-5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                placeholder="Enter current / temporary password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />

              <Input
                label="New Password"
                type="password"
                placeholder="At least 8 characters with letters & numbers"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />

              {/* Password Checklist */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/60 space-y-2 text-xs">
                <p className="font-semibold text-slate-700">Password Requirements:</p>
                <div className="grid grid-cols-2 gap-1.5 text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className={`w-3.5 h-3.5 ${isMinLength ? "text-emerald-600" : "text-slate-300"}`} />
                    <span>8+ characters</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className={`w-3.5 h-3.5 ${hasLetter ? "text-emerald-600" : "text-slate-300"}`} />
                    <span>Contains letter</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className={`w-3.5 h-3.5 ${hasNumber ? "text-emerald-600" : "text-slate-300"}`} />
                    <span>Contains number</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className={`w-3.5 h-3.5 ${isMatch ? "text-emerald-600" : "text-slate-300"}`} />
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={isLoading}
                disabled={!isValid}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                Update Password & Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <ToastContainer />
    </div>
  );
}
