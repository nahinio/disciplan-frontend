import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { Team, TeamMember } from "@/data/mockTeams";

function mapTeam(row: Record<string, unknown>): Team {
  const members = Array.isArray(row.members)
    ? (row.members as Record<string, unknown>[]).map(
        (m): TeamMember => ({
          email: String(m.email ?? ""),
          name: String(m.name ?? m.email ?? ""),
          status: "accepted",
          pendingTasks: [],
        })
      )
    : [];
  return {
    id: String(row.id),
    teamName: String(row.team_name ?? ""),
    leaderName: String(row.leader_name ?? ""),
    leaderEmail: String(row.leader_email ?? ""),
    courseCode: String(row.course_code ?? ""),
    courseTitle: String(row.course_title ?? ""),
    section: row.section ? String(row.section) : undefined,
    members,
  };
}

export function useSectionTeams(
  courseCode: string,
  sectionLabel: string,
  enabled: boolean
) {
  const qc = useQueryClient();
  const teamsKey = queryKeys.section.teams(courseCode, sectionLabel);

  const query = useQuery({
    queryKey: teamsKey,
    queryFn: async () => {
      const res = await api.getSectionTeams(courseCode, sectionLabel);
      return (res.items as Record<string, unknown>[]).map(mapTeam);
    },
    enabled: enabled && Boolean(courseCode && sectionLabel),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const invalidate = useCallback(async () => {
    await qc.refetchQueries({ queryKey: teamsKey });
    void qc.invalidateQueries({ queryKey: queryKeys.teams.list });
  }, [qc, teamsKey]);

  const teamMutation = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      void invalidate();
    },
  });

  const refresh = useCallback(async () => {
    await qc.refetchQueries({ queryKey: teamsKey });
  }, [qc, teamsKey]);

  return {
    teams: query.data ?? [],
    loading: query.isPending,
    refresh,
    facultyAssignTeam: async (
      name: string,
      leaderUserId: number,
      memberUserIds: number[]
    ) => {
      const res = await teamMutation.mutateAsync(() =>
        api.facultyAssignTeam({
          name,
          course_code: courseCode,
          section_label: sectionLabel,
          leader_user_id: leaderUserId,
          member_user_ids: memberUserIds,
        })
      );
      return Number((res as { id: number }).id);
    },
    updateTeam: async (
      teamId: number,
      body: {
        name?: string;
        leader_user_id?: number;
        add_member_user_ids?: number[];
        remove_member_user_ids?: number[];
      }
    ) => {
      await teamMutation.mutateAsync(() => api.updateTeam(teamId, body));
    },
    gradeTeam: async (
      teamId: number,
      score: number,
      maxScore: number,
      label = "Project"
    ) => {
      await teamMutation.mutateAsync(() =>
        api.gradeTeam(teamId, { score, max_score: maxScore, label })
      );
    },
  };
}
