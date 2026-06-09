import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { mapTeamDetail } from "@/lib/mappers";
import { queryKeys } from "@/lib/queryKeys";
import type { Team } from "@/data/mockTeams";

export function useTeamDetail(teamId: string) {
  const qc = useQueryClient();
  const id = Number(teamId);
  const enabled = isAuthenticated() && Number.isFinite(id);

  const query = useQuery({
    queryKey: queryKeys.teams.detail(teamId),
    queryFn: async () => {
      const row = await api.getTeam(id);
      return mapTeamDetail(row);
    },
    enabled,
    refetchInterval: 25_000,
    refetchOnWindowFocus: true,
  });

  const invalidate = useCallback(async () => {
    await qc.refetchQueries({ queryKey: queryKeys.teams.detail(teamId) });
    void qc.invalidateQueries({ queryKey: queryKeys.teams.list });
  }, [qc, teamId]);

  const teamMutation = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      void invalidate();
    },
  });

  const refresh = useCallback(async () => {
    await qc.refetchQueries({ queryKey: queryKeys.teams.detail(teamId) });
  }, [qc, teamId]);

  const team = query.data ?? null;

  const createTask = async (
    title: string,
    description: string | undefined,
    assigneeEmail: string | undefined,
    dueDate: Date
  ) => {
    const member = team?.members.find(
      (m) => m.email === assigneeEmail && m.status === "accepted"
    );
    await teamMutation.mutateAsync(() =>
      api.createTeamTask(id, {
        title,
        description,
        assignee_user_id: member?.userId,
        due_at: dueDate.toISOString(),
      })
    );
  };

  return {
    team,
    loading: query.isPending,
    isFetching: query.isFetching,
    error: query.isError,
    refresh,
    createTask,
    toggleTask: async (taskId: string, completed: boolean) => {
      await teamMutation.mutateAsync(() => api.toggleTeamTask(id, Number(taskId), completed));
    },
    createDate: async (label: string, occursAt: Date) => {
      await teamMutation.mutateAsync(() =>
        api.createTeamDate(id, { label, occurs_at: occursAt.toISOString() })
      );
    },
    createAnnouncement: async (title: string, body: string) => {
      await teamMutation.mutateAsync(() =>
        api.createTeamAnnouncement(id, { title, body })
      );
    },
  };
}
