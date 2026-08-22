"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/useToast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { Bell, Check, Sparkles, CheckCircle2 } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    async function loadNotifications() {
      try {
        setIsLoading(true);
        const data = await apiFetch<NotificationItem[]>("/api/notifications");
        setNotifications(data || []);
      } catch {
        // Silently catch error
      } finally {
        setIsLoading(false);
      }
    }

    loadNotifications();
  }, [user]);

  const markAllRead = async () => {
    try {
      await apiFetch("/api/notifications", { method: "PATCH" });
      toast.success("All notifications marked as read.", "Notifications Updated");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      toast.error("Failed to update notifications", "Error");
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-200 max-w-4xl mx-auto">
      <PageHeader
        title="Notifications Inbox"
        description="System notifications, leave requests alerts, and operational updates."
        action={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={markAllRead} leftIcon={<Check className="w-4 h-4" />}>
              Mark All as Read
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>All Notifications</CardTitle>
            <CardDescription>Chronological list of inbox alerts</CardDescription>
          </div>
          {unreadCount > 0 && <Badge variant="purple">{unreadCount} Unread</Badge>}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="w-6 h-6 text-slate-400" />}
              title="You're all caught up!"
              description="No notifications present in your inbox."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 flex items-start gap-4 transition-colors rounded-xl ${
                    !n.isRead ? "bg-violet-50/40 font-semibold" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                      <span className="text-[10px] text-slate-400 shrink-0">{formatDate(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-600 font-normal leading-relaxed">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
