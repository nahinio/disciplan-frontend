import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { mapBlogPostListItem } from "@/lib/mappers";
import { queryKeys } from "@/lib/queryKeys";
import type { BlogPost } from "@/data/mockBlog";

export function useBlogPosts(
  courseCode?: string,
  limit = 50,
  topicId?: number | null
) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.blogs.list(courseCode, topicId, limit),
    queryFn: async () => {
      const res = await api.getBlogs(
        courseCode
          ? {
              course_code: courseCode,
              limit,
              ...(topicId != null ? { topic_id: topicId } : {}),
            }
          : { limit }
      );
      return (res.items as Record<string, unknown>[]).map(mapBlogPostListItem);
    },
    refetchInterval: 45_000,
  });

  const refresh = useCallback(async () => {
    if (courseCode) {
      await qc.invalidateQueries({ queryKey: ["blogs", courseCode] });
    } else {
      await qc.invalidateQueries({ queryKey: ["blogs"] });
    }
  }, [qc, courseCode]);

  return {
    posts: query.data ?? [],
    loading: query.isPending,
    refresh,
  };
}
