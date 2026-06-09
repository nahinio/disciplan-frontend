import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { mapForumReply, mapForumThread } from "@/lib/mappers";
import { queryKeys } from "@/lib/queryKeys";
import type { ForumThread } from "@/data/mockForum";
import type { ForumReply } from "@/lib/mappers";

export function useForumFeed(options: {
  courseCode?: string;
  threadType?: string;
  sort?: "recent" | "top";
  mineOnly?: boolean;
}) {
  const courseKey = options.courseCode ?? "all";
  const typeKey = options.threadType ?? "all";
  const sort = options.sort ?? "recent";
  const mineOnly = options.mineOnly ?? false;

  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.forum.feed(courseKey, typeKey, sort, mineOnly),
    queryFn: async () => {
      const res = await api.getForumFeed({
        course_code: options.courseCode,
        thread_type: options.threadType,
        sort,
        mine_only: mineOnly || undefined,
      });
      return (res.items as Record<string, unknown>[]).map(mapForumThread);
    },
    refetchInterval: 45_000,
  });

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({
      queryKey: queryKeys.forum.feed(courseKey, typeKey, sort, mineOnly),
    });
  }, [qc, courseKey, typeKey, sort, mineOnly]);

  return { threads: query.data ?? [], loading: query.isPending, refresh };
}

export function useForumThreads(
  courseCode: string,
  options?: { threadType?: string; mineOnly?: boolean }
) {
  const qc = useQueryClient();
  const typeKey = options?.threadType ?? "all";
  const mineOnly = options?.mineOnly ?? false;

  const query = useQuery({
    queryKey: queryKeys.forum.threads(courseCode, typeKey, mineOnly),
    queryFn: async () => {
      const res = await api.getForumThreads(courseCode, {
        thread_type: options?.threadType,
        mine_only: mineOnly || undefined,
      });
      return (res.items as Record<string, unknown>[]).map(mapForumThread);
    },
    enabled: Boolean(courseCode),
    refetchInterval: 45_000,
  });

  const refresh = useCallback(async () => {
    if (!courseCode) return;
    await qc.invalidateQueries({
      queryKey: queryKeys.forum.threads(courseCode, typeKey, mineOnly),
    });
  }, [qc, courseCode, typeKey, mineOnly]);

  return { threads: query.data ?? [], loading: query.isPending, refresh };
}

export function useForumThreadDetail(threadId: number | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.forum.thread(threadId ?? 0),
    queryFn: async () => {
      const raw = await api.getForumThread(threadId!);
      const row = raw as Record<string, unknown>;
      const thread = mapForumThread({ ...row, reply_count: 0 });
      const replyRows = Array.isArray(row.replies)
        ? (row.replies as Record<string, unknown>[])
        : [];
      const replies = replyRows.map((r) => mapForumReply(r, String(threadId)));
      return { thread, replies };
    },
    enabled: threadId != null && Number.isFinite(threadId),
  });

  const refresh = useCallback(async () => {
    if (!threadId) return;
    await qc.invalidateQueries({ queryKey: queryKeys.forum.thread(threadId) });
  }, [qc, threadId]);

  return {
    thread: query.data?.thread ?? null,
    replies: query.data?.replies ?? [],
    loading: query.isPending,
    refresh,
  };
}
