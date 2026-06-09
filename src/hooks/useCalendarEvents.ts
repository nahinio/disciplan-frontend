import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { invalidatePlannerData } from "@/lib/invalidateAppData";
import { queryKeys } from "@/lib/queryKeys";

export interface CalendarEventItem {
  id: number;
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  course_code?: string;
  item_type?: "event" | "task";
  completion_percent?: number;
  is_completed?: boolean;
  planner_task_type_code?: string;
  event_plan_id?: number | null;
}

function mapCalendarEvents(items: Record<string, unknown>[]): CalendarEventItem[] {
  return items.map((r) => ({
    id: Number(r.id),
    title: String(r.title ?? ""),
    description: r.description ? String(r.description) : undefined,
    starts_at: String(r.starts_at ?? ""),
    ends_at: String(r.ends_at ?? ""),
    all_day: Boolean(r.all_day),
    course_code: r.course_code ? String(r.course_code) : undefined,
    item_type: r.item_type ? (String(r.item_type) as "event" | "task") : "event",
    completion_percent:
      r.completion_percent != null ? Number(r.completion_percent) : undefined,
    is_completed: r.is_completed != null ? Boolean(r.is_completed) : undefined,
    planner_task_type_code: r.planner_task_type_code
      ? String(r.planner_task_type_code)
      : undefined,
    event_plan_id: r.event_plan_id != null ? Number(r.event_plan_id) : null,
  }));
}

export function useCalendarEvents(includeTasks = true) {
  const qc = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: queryKeys.calendar.events(includeTasks),
    queryFn: async () => {
      const res = await api.getCalendarEvents(includeTasks);
      return mapCalendarEvents(res.items as Record<string, unknown>[]);
    },
    refetchInterval: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.createCalendarEvent(body),
    onSuccess: () => invalidatePlannerData(qc),
  });

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["calendar", "events"] });
  }, [qc]);

  return {
    events: eventsQuery.data ?? [],
    loading: eventsQuery.isPending,
    refresh,
    createEvent: async (body: Record<string, unknown>) => {
      await createMutation.mutateAsync(body);
    },
  };
}
