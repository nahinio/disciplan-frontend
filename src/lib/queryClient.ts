import { QueryClient } from "@tanstack/react-query";

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 2,
        throwOnError: false,
        refetchOnMount: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
