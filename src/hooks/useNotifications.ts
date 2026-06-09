import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { useUserStats } from "@/hooks/useUserStats";
import { queryKeys } from "@/lib/queryKeys";

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  date: "Today" | "Yesterday" | "Older";
  category: "academic" | "teams" | "system";
  read: boolean;
  link?: string;
}

function mapCategory(
  typeCode: string,
  referenceType?: string,
  actionPath?: string,
): Notification["category"] {
  if (typeCode.includes("team") || typeCode.includes("message") || referenceType === "team") {
    return "teams";
  }
  if (typeCode.includes("system")) return "system";
  if (typeCode.includes("announcement")) {
    if (actionPath?.includes("/teams/")) return "teams";
    if (actionPath?.includes("/courses/")) return "academic";
    return "system";
  }
  return "academic";
}

function relativeDate(createdAt: string): Notification["date"] {
  const diffDays = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return "Older";
}

function relativeTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function mapNotifications(items: Record<string, unknown>[]): Notification[] {
  return items.map((n) => ({
    id: String(n.id),
    title: String(n.title ?? ""),
    description: String(n.body_preview ?? ""),
    time: relativeTime(String(n.created_at ?? "")),
    date: relativeDate(String(n.created_at ?? "")),
    category: mapCategory(
      String(n.type_code ?? ""),
      n.reference_type_code ? String(n.reference_type_code) : undefined,
      n.action_path ? String(n.action_path) : undefined,
    ),
    read: Boolean(n.is_read),
    link: n.action_path
      ? String(n.action_path).replace(/^\/app(\?|$|\/)/, "/dashboard$1")
      : undefined,
  }));
}

export function useNotifications() {
  const { profile, profileReady } = useUserStats();
  const qc = useQueryClient();
  const enabled = profileReady && profile.role !== "admin" && isAuthenticated();

  const listQuery = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const list = await api.getNotifications();
      const items = (list as { items?: Array<Record<string, unknown>> }).items ?? [];
      return mapNotifications(items);
    },
    enabled,
    refetchInterval: 8_000,
  });

  const countQuery = useQuery({
    queryKey: [...queryKeys.notifications, "unread"],
    queryFn: async () => {
      const res = await api.getUnreadCount();
      return res.unread_count;
    },
    enabled,
    refetchInterval: 8_000,
  });

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: queryKeys.notifications });
  }, [qc]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(Number(id)),
    onSuccess: invalidate,
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: invalidate,
  });

  const notifications = listQuery.data ?? [];
  const unreadCount = countQuery.data ?? 0;

  const markAsRead = async (id: string) => {
    try {
      await markReadMutation.mutateAsync(id);
    } catch {
      /* ignore */
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllMutation.mutateAsync();
    } catch {
      /* ignore */
    }
  };

  const deleteNotification = async (id: string) => {
    await markAsRead(id);
    await invalidate();
  };

  const toggleReadStatus = async (id: string) => {
    const item = notifications.find((n) => n.id === id);
    if (!item) return;
    if (!item.read) {
      await markAsRead(id);
      return;
    }
    qc.setQueryData<Notification[]>(queryKeys.notifications, (prev) =>
      (prev ?? []).map((n) => (n.id === id ? { ...n, read: false } : n))
    );
    qc.setQueryData<number>([...queryKeys.notifications, "unread"], (c) => (c ?? 0) + 1);
  };

  const clearAll = async () => {
    await markAllAsRead();
    await invalidate();
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    toggleReadStatus,
    clearAll,
    resetNotifications: invalidate,
    refresh: invalidate,
  };
}
