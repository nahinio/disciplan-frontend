import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { mapPendingInvitation, mapTeamListItem } from "@/lib/mappers";
import { queryKeys } from "@/lib/queryKeys";
import type { Team } from "@/data/mockTeams";

export type TeamListItem = Team & { memberCount?: number; isPinned?: boolean };

export function useTeamsHub() {
  const qc = useQueryClient();
  const enabled = isAuthenticated();

  const teamsQuery = useQuery({
    queryKey: queryKeys.teams.list,
    queryFn: async () => {
      const res = await api.getTeams();
      return (res.items as Record<string, unknown>[]).map(mapTeamListItem);
    },
    enabled,
    refetchInterval: 30_000,
  });

  const invitationsQuery = useQuery({
    queryKey: queryKeys.teams.invitations,
    queryFn: async () => {
      const res = await api.getPendingTeamInvitations();
      return (res.items as Record<string, unknown>[]).map(mapPendingInvitation);
    },
    enabled,
    refetchInterval: 30_000,
  });

  const invalidateTeams = useCallback(() => {
    void qc.invalidateQueries({ queryKey: queryKeys.teams.list });
    void qc.invalidateQueries({ queryKey: queryKeys.teams.invitations });
  }, [qc]);

  const respondMutation = useMutation({
    mutationFn: ({ invitationId, accept }: { invitationId: string; accept: boolean }) =>
      api.respondTeamInvitation(Number(invitationId), accept),
    onSuccess: invalidateTeams,
  });

  const leaveMutation = useMutation({
    mutationFn: (teamId: string) => api.leaveTeam(Number(teamId)),
    onSuccess: invalidateTeams,
  });

  const disbandMutation = useMutation({
    mutationFn: (teamId: string) => api.disbandTeam(Number(teamId)),
    onSuccess: invalidateTeams,
  });

  const pinMutation = useMutation({
    mutationFn: (team: TeamListItem) =>
      team.isPinned ? api.unpinTeam(Number(team.id)) : api.pinTeam(Number(team.id)),
    onSuccess: invalidateTeams,
  });

  const refresh = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.teams.list }),
      qc.invalidateQueries({ queryKey: queryKeys.teams.invitations }),
    ]);
  }, [qc]);

  return {
    teams: teamsQuery.data ?? [],
    invitations: invitationsQuery.data ?? [],
    loading: enabled && (teamsQuery.isPending || invitationsQuery.isPending),
    refresh,
    respondInvitation: async (invitationId: string, accept: boolean) => {
      await respondMutation.mutateAsync({ invitationId, accept });
    },
    leaveTeam: async (teamId: string) => {
      await leaveMutation.mutateAsync(teamId);
    },
    disbandTeam: async (teamId: string) => {
      await disbandMutation.mutateAsync(teamId);
    },
    togglePin: async (team: TeamListItem) => {
      await pinMutation.mutateAsync(team);
    },
  };
}
