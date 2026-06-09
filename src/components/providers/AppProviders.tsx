import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { UserStatsProvider } from "@/hooks/useUserStats";
import { createAppQueryClient } from "@/lib/queryClient";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createAppQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <UserStatsProvider>{children}</UserStatsProvider>
    </QueryClientProvider>
  );
}
