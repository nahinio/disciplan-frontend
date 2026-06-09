import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useChatGroup } from "@/hooks/useChatGroup";

export function useSectionChat(
  courseCode: string,
  sectionLabel: string,
  facultyName?: string
) {
  const [groupId, setGroupId] = useState<number | null>(null);

  const resolveGroup = useCallback(async () => {
    const res = await api.getChatGroups();
    const items = res.items as Record<string, unknown>[];
    const match = items.find(
      (g) =>
        String(g.course_code ?? "") === courseCode &&
        String(g.section_label ?? "") === sectionLabel
    );
    if (match) {
      setGroupId(Number(match.id));
      return Number(match.id);
    }
    setGroupId(null);
    return null;
  }, [courseCode, sectionLabel]);

  useEffect(() => {
    setGroupId(null);
    void resolveGroup();
  }, [resolveGroup]);

  const { messages, sendMessage, refresh, wsConnected } = useChatGroup(groupId, {
    courseCode,
    section: sectionLabel,
    facultyName,
  });

  return { messages, groupId, sendMessage, refresh, wsConnected };
}
