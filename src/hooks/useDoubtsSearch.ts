import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { mapDoubtSearchRow } from "@/lib/doubtForum";
import { queryKeys } from "@/lib/queryKeys";

export type DoubtSearchStatus = "all" | "resolved";

export function useDoubtsSearch({
  q,
  courseCode,
  sectionLabel,
  status = "all",
  enabled = true,
}: {
  q: string;
  courseCode?: string;
  sectionLabel?: string;
  status?: DoubtSearchStatus;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.doubts.search(q, courseCode, sectionLabel, status),
    queryFn: async () => {
      const res = await api.searchDoubts({
        q: q.trim() || undefined,
        course_code: courseCode,
        section_label: sectionLabel,
        status,
      });
      const items = (res.items as Record<string, unknown>[]).map(mapDoubtSearchRow);
      return { items, total: Number(res.total ?? items.length) };
    },
    enabled: isAuthenticated() && enabled,
    staleTime: 15_000,
  });
}
