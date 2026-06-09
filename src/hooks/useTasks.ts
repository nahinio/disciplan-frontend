import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { invalidatePlannerData } from "@/lib/invalidateAppData";
import { queryKeys } from "@/lib/queryKeys";

export interface UserTask {
  id: number;
  title: string;
  description?: string | null;
  due_at?: string | null;
  is_completed: boolean;
  completion_percent?: number;
  computed_weight?: number;
  live_weight?: number;
  estimated_effort_min?: number | null;
  is_skipped?: boolean;
  reschedule_count?: number;
  source?: string;
  course_code?: string | null;
  section_key?: string | null;
  priority_code?: string;
  energy_level_code?: string | null;
  energy_sort_order?: number | null;
  planner_task_type_code?: string | null;
  planner_task_type_label?: string | null;
  task_type_code?: string | null;
  task_type_label?: string | null;
  attachment_url?: string | null;
  attachment_file_id?: number | null;
  event_plan_id?: number | null;
  slice_date?: string | null;
  base_target_percent?: number | null;
  carryover_percent?: number | null;
  effective_target_percent?: number | null;
  completed_portion_percent?: number | null;
  days_behind?: number | null;
  was_skipped_forward?: boolean;
  weight_profile?: "planner" | "scheduled" | null;
  occurrence_starts_at?: string | null;
}

export type EnergyLevel = "low" | "medium" | "high";

export function useTasks() {
  const qc = useQueryClient();
  const enabled = isAuthenticated();

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks.all,
    queryFn: async () => {
      const res = await api.getTasks();
      return res.items as UserTask[];
    },
    enabled,
  });

  const todayQuery = useQuery({
    queryKey: queryKeys.tasks.today,
    queryFn: async () => {
      const res = await api.getTodayTasks();
      return res.items as UserTask[];
    },
    enabled,
    retry: 1,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const energyQuery = useQuery({
    queryKey: queryKeys.tasks.energy,
    queryFn: async () => {
      const res = await api.getDailyEnergy();
      return (res.energy?.energy_level_code as EnergyLevel | undefined) ?? null;
    },
    enabled,
  });

  const invalidateTasks = useCallback(() => {
    invalidatePlannerData(qc);
  }, [qc]);

  const setEnergyMutation = useMutation({
    mutationFn: (level: EnergyLevel) => api.setDailyEnergy(level),
    onSuccess: (_data, level) => {
      qc.setQueryData(queryKeys.tasks.energy, level);
      invalidateTasks();
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.createTask(body),
    onSuccess: invalidateTasks,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.updateTask(id, body),
    onSuccess: invalidateTasks,
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => api.deleteTask(id),
    onSuccess: invalidateTasks,
  });

  const refresh = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all }),
      qc.invalidateQueries({ queryKey: queryKeys.tasks.today }),
      qc.invalidateQueries({ queryKey: queryKeys.tasks.energy }),
    ]);
  }, [qc]);

  const tasksLoading = enabled && tasksQuery.isPending;
  const todayLoading = enabled && todayQuery.isPending && !todayQuery.isError;
  const todayError = todayQuery.isError;
  const energyLoading = enabled && energyQuery.isPending;

  return {
    tasks: tasksQuery.data ?? [],
    todayTasks: todayQuery.data ?? [],
    dailyEnergy: energyQuery.data ?? null,
    /** @deprecated Prefer tasksLoading / todayLoading for the surface you render. */
    loading: tasksLoading,
    tasksLoading,
    todayLoading,
    todayError,
    energyLoading,
    refresh,
    setEnergy: async (level: EnergyLevel) => {
      await setEnergyMutation.mutateAsync(level);
    },
    createTask: async (body: Record<string, unknown>) => {
      await createTaskMutation.mutateAsync(body);
    },
    updateTask: async (id: number, body: Record<string, unknown>) => {
      await updateTaskMutation.mutateAsync({ id, body });
    },
    deleteTask: async (id: number) => {
      await deleteTaskMutation.mutateAsync(id);
    },
    updateProgress: async (id: number, completion_percent: number, task?: UserTask) => {
      if (task?.source === "event_slice") {
        const eff = Number(task.effective_target_percent ?? 100);
        const portion = (completion_percent / 100) * eff;
        await updateTaskMutation.mutateAsync({
          id,
          body: { completed_portion_percent: portion },
        });
        return;
      }
      await updateTaskMutation.mutateAsync({
        id,
        body: { completion_percent, completed: completion_percent >= 100 },
      });
    },
    skipTask: async (id: number) => {
      await updateTaskMutation.mutateAsync({ id, body: { skipped: true } });
    },
    toggleComplete: async (id: number, completed: boolean, task?: UserTask) => {
      if (task?.source === "event_slice") {
        const eff = Number(task.effective_target_percent ?? 100);
        await updateTaskMutation.mutateAsync({
          id,
          body: { completed, completed_portion_percent: completed ? eff : 0 },
        });
        return;
      }
      await updateTaskMutation.mutateAsync({
        id,
        body: { completed, completion_percent: completed ? 100 : 0 },
      });
    },
  };
}

export function taskDifficulty(priority?: string | null): "Hard" | "Medium" | "Easy" {
  if (priority === "high" || priority === "urgent") return "Hard";
  if (priority === "low") return "Easy";
  return "Medium";
}

export function formatDue(dueAt?: string | null): string | undefined {
  if (!dueAt) return undefined;
  const due = new Date(dueAt);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffH = Math.round(diffMs / 3600000);
  if (diffH < 0) return "Overdue";
  if (diffH < 24) return `Due in ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  return `Due in ${diffD}d`;
}

export const FACULTY_TASK_TYPES = [
  { code: "lecture_prep", label: "Lecture preparation" },
  { code: "grading", label: "Grading" },
  { code: "exam_quiz", label: "Exam / Quiz" },
  { code: "meeting", label: "Meeting" },
  { code: "one_time", label: "One-time" },
  { code: "personal", label: "Personal" },
];

export const STUDENT_TASK_TYPES = [
  { code: "ct", label: "Exam" },
  { code: "assignment", label: "Assignment" },
  { code: "one_time", label: "One-time" },
  { code: "personal_goal", label: "Personal goal" },
];

export function isExamTask(task: UserTask): boolean {
  return task.planner_task_type_code === "ct";
}

export function displayTaskTypeLabel(
  task: UserTask,
  role: "student" | "faculty" | "admin" | string
): string | null {
  if (role === "student" && isExamTask(task)) return "Exam";
  return task.planner_task_type_label ?? null;
}

export function sectionLabelFromKey(sectionKey?: string | null): string | undefined {
  if (!sectionKey) return undefined;
  const parts = sectionKey.split("::");
  return parts[1]?.trim() || undefined;
}

export function isPlannerTask(task: UserTask): boolean {
  if (task.weight_profile === "scheduled") return false;
  if (task.source === "one_time" || task.source === "recurring_occurrence") return false;
  return true;
}

export function sliceProgressPercent(task: UserTask): number {
  if (task.source !== "event_slice") {
    return task.completion_percent ?? (task.is_completed ? 100 : 0);
  }
  const eff = Number(task.effective_target_percent ?? 100);
  const done = Number(task.completed_portion_percent ?? 0);
  if (eff <= 0) return 0;
  return Math.min(100, Math.round((done / eff) * 100));
}
