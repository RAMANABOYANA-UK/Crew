"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  loginId: string | null;
  role: "EMPLOYEE" | "HR" | "ADMIN";
  mustChangePassword: boolean;
  isFirstLogin: boolean;
  employee?: {
    id: string;
    employeeId: string | null;
    firstName: string;
    lastName: string;
    department: string | null;
    designation: string | null;
    profilePic: string | null;
    phone: string | null;
    status?: string | null;
    paidLeaveBalance: number;
    sickLeaveBalance: number;
    basicSalary?: number | null;
    hra?: number | null;
    allowances?: number | null;
  } | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  refetchUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null,
  refetchUser: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch<AuthUser>("/api/auth/me");
      setUser(data);
      setError(null);
    } catch (err: any) {
      setUser(null);
      setError(err.message || "Failed to fetch user");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchUser();
  }, [refetchUser]);

  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore logout errors
    } finally {
      setUser(null);
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, refetchUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
