import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { mapApiOffering, sectionKey } from "@/lib/offerings";
import type { CourseOffering } from "@/types/course";
import { useUserStats } from "@/hooks/useUserStats";
import { isAuthenticated } from "@/lib/auth";
import { queryKeys } from "@/lib/queryKeys";

export function useOfferings() {
  const { profile, profileReady } = useUserStats();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.offerings,
    queryFn: async () => {
      const { items } = await api.getOfferings();
      return items.map((row) => mapApiOffering(row));
    },
    enabled: profileReady && profile.role !== "admin",
    staleTime: 45_000,
  });

  const offerings = useMemo(() => {
    const all = query.data ?? [];
    const enrolled = isAuthenticated() ? (profile.sections ?? []) : [];
    if (enrolled.length > 0) {
      const keys = new Set(enrolled.map((s) => s.toLowerCase()));
      return all.filter((o) =>
        keys.has(sectionKey(o.course_code, o.section).toLowerCase())
      );
    }
    return all;
  }, [query.data, profile.sections]);

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.offerings });
  }, [qc]);

  const findOffering = useCallback(
    (courseCode: string, section?: string) => {
      if (section) {
        return offerings.find(
          (o) => o.course_code === courseCode && o.section === section
        );
      }
      return offerings.find((o) => o.course_code === courseCode);
    },
    [offerings]
  );

  return {
    offerings,
    loading: profileReady && profile.role !== "admin" && query.isPending,
    refresh,
    findOffering,
  };
}
