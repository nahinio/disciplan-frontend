import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useChatGroup } from "@/hooks/useChatGroup";

export function useTeamChat(teamId: string) {
  const [groupId, setGroupId] = useState<number | null>(null);

  const resolveGroup = useCallback(async () => {
    const res = await api.getChatGroups();
    const items = res.items as Record<string, unknown>[];
    const match = items.find((g) => Number(g.team_id) === Number(teamId));
    if (match) {
      setGroupId(Number(match.id));
      return Number(match.id);
    }
    setGroupId(null);
    return null;
  }, [teamId]);

  useEffect(() => {
    setGroupId(null);
    void resolveGroup();
  }, [resolveGroup]);

  const { messages, sendMessage, refresh, wsConnected } = useChatGroup(groupId, {
    courseCode: "team",
    section: teamId,
  });

  return { messages, groupId, sendMessage, refresh, wsConnected };
}
