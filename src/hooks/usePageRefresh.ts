import { useCallback, useState } from "react";

/** Wraps async refresh handlers with shared loading state for RefreshButton. */
export function usePageRefresh(refreshFn: () => void | Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshFn();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshFn, isRefreshing]);

  return { refresh, isRefreshing };
}
