import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { mapBlogComment, mapBlogPostDetail } from "@/lib/mappers";
import { queryKeys } from "@/lib/queryKeys";
import type { BlogPost, Comment } from "@/data/mockBlog";

export function useBlogPost(postId: number | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.blogs.post(postId ?? 0),
    queryFn: async () => {
      const raw = await api.getBlogPost(postId!);
      const mapped = mapBlogPostDetail(raw as Record<string, unknown>);
      const commentRows = Array.isArray(raw.comments)
        ? (raw.comments as Record<string, unknown>[])
        : [];
      const comments = commentRows.map((c) => mapBlogComment(c, mapped.id));
      const post: BlogPost = { ...mapped, commentCount: commentRows.length };
      return { post, comments };
    },
    enabled: postId != null && Number.isFinite(postId),
    refetchInterval: 30_000,
  });

  const refresh = useCallback(async () => {
    if (!postId) return;
    await qc.invalidateQueries({ queryKey: queryKeys.blogs.post(postId) });
  }, [qc, postId]);

  return {
    post: query.data?.post ?? null,
    comments: query.data?.comments ?? [],
    loading: query.isPending,
    refresh,
  };
}
