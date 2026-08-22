"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/useToast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { ToastContainer } from "@/components/ui/Toast";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { Eye, EyeOff, Lock, User, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) {
      setErrorMsg("Please enter your Login ID / Email and Password.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);

      const res = await apiFetch<{
        user: { mustChangePassword: boolean; role: string; email: string };
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ loginId, password }),
      });

      toast.success("Welcome back!", "Signed in");

      if (res?.user?.mustChangePassword) {
        router.push("/change-password");
      } else {
        router.push(redirectUrl);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid credentials. Please try again.");
      toast.error(err.message || "Invalid credentials", "Login Failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 antialiased">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white mx-auto flex items-center justify-center font-bold text-2xl shadow-lg shadow-violet-600/30">
            C
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{APP_NAME}</h1>
          <p className="text-xs text-slate-500 font-medium">{APP_TAGLINE}</p>
        </div>

        {/* Login Card */}
        <Card className="border border-slate-200/80 shadow-md">
          <CardHeader className="text-center pb-2">
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>Enter your company credentials to access your dashboard</CardDescription>
          </CardHeader>

          <CardContent>
            {errorMsg && (
              <div className="p-3.5 mb-5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2.5 animate-in fade-in-0 duration-150">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Login ID or Email Address"
                placeholder="e.g. OIRAKU20210001 or name@company.com"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                required
                autoFocus
              />

              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo World Footnote */}
        <div className="p-4 rounded-xl bg-violet-50/60 border border-violet-100 text-center space-y-1">
          <p className="text-xs font-semibold text-violet-900">Demo Accounts Available</p>
          <p className="text-[11px] text-violet-700">
            Admin: <code className="bg-violet-100 px-1 py-0.5 rounded font-mono text-[10px]">OIRAKU20210001</code> | Pass: <code className="bg-violet-100 px-1 py-0.5 rounded font-mono text-[10px]">Welcome@123</code>
          </p>
          <p className="text-[11px] text-violet-700">
            Employee: <code className="bg-violet-100 px-1 py-0.5 rounded font-mono text-[10px]">OIAMPA20220003</code> | Pass: <code className="bg-violet-100 px-1 py-0.5 rounded font-mono text-[10px]">Welcome@123</code>
          </p>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
