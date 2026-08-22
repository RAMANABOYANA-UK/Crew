"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { ShieldCheck, Search, FileText } from "lucide-react";

interface AuditLogItem {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export default function AuditLogsPage() {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadAuditLogs() {
      try {
        setIsLoading(true);
        const data = await apiFetch<AuditLogItem[]>("/api/audit");
        setLogs(data || []);
      } catch {
        // Silently catch error
      } finally {
        setIsLoading(false);
      }
    }

    loadAuditLogs();
  }, [user]);

  const filteredLogs = logs.filter((log) => {
    const text = `${log.action} ${log.entity} ${log.userId || ""} ${log.details || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-200">
      <PageHeader
        title="Immutable Audit Logs"
        description="System activity trail logging administrative changes, employee account provisioning, and security events."
      />

      {/* Filter Bar */}
      <Card>
        <div className="flex items-center justify-between p-1">
          <Input
            placeholder="Search by action, entity, or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            className="w-full sm:w-80"
          />

          <Badge variant="gray" size="md">
            {filteredLogs.length} Log Entries
          </Badge>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>System Activity Trail</CardTitle>
          <CardDescription>Read-only, timestamped audit log records</CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : filteredLogs.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="w-5 h-5 text-slate-400" />}
              title="No audit log entries"
              description="System events will be logged here automatically."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Entity</th>
                    <th className="p-3">Actor / User</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium font-mono">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                      <td className="p-3 font-bold text-violet-700">
                        <Badge variant="purple" size="sm">{log.action}</Badge>
                      </td>
                      <td className="p-3 font-semibold text-slate-900">{log.entity}</td>
                      <td className="p-3 text-slate-700">{log.userId || "SYSTEM"}</td>
                      <td className="p-3 text-slate-500">{log.ipAddress || "127.0.0.1"}</td>
                      <td className="p-3 text-slate-600 font-sans max-w-xs truncate">{log.details || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
