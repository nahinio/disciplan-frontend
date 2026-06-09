import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CatalogueCourse } from "@/data/mockCatalogue";
import { mapCatalogueCourse } from "@/lib/offerings";
import { queryKeys } from "@/lib/queryKeys";

export function useCatalogue() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.catalogue,
    queryFn: async () => {
      const res = await api.getCatalogue();
      return (res.items as Record<string, unknown>[]).map(mapCatalogueCourse);
    },
    staleTime: 60_000,
  });

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.catalogue });
  }, [qc]);

  return {
    catalogue: query.data ?? [],
    loading: query.isPending,
    refresh,
  };
}
