import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { queryKeys } from "@/lib/queryKeys";
import type { RoutineSlot } from "@/lib/routineUtils";

export function useRoutine() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.routine,
    queryFn: async () => {
      const res = await api.getRoutine();
      return res.items as RoutineSlot[];
    },
    enabled: isAuthenticated(),
    staleTime: 45_000,
    retry: 1,
  });

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.routine });
  }, [qc]);

  return {
    slots: query.data ?? [],
    loading: query.isPending,
    refresh,
  };
}
