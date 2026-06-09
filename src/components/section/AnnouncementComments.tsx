import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CommentThread } from "@/components/blogs/CommentThread";
import { useUserStats } from "@/hooks/useUserStats";
import { queryKeys } from "@/lib/queryKeys";
import type { Comment } from "@/data/mockBlog";

function mapComments(items: Record<string, unknown>[], announcementId: string): Comment[] {
  return items.map((c) => ({
    id: String(c.id),
    postId: announcementId,
    body: String(c.body ?? ""),
    createdAt: new Date(String(c.created_at ?? Date.now())),
    isVerified: Boolean(c.is_pinned),
    author: {
      name: String(c.author_name ?? ""),
      role: (String(c.author_role_code ?? "student") === "faculty"
        ? "faculty"
        : "student") as "student" | "faculty",
      initials: "—",
    },
    parentId: c.parent_comment_id ? String(c.parent_comment_id) : null,
    upvotes: 0,
    downvotes: 0,
  }));
}

export function AnnouncementComments({ announcementId }: { announcementId: string }) {
  const qc = useQueryClient();
  const { profile } = useUserStats();
  const isFaculty = profile.role === "faculty" || profile.role === "admin";

  const commentsQuery = useQuery({
    queryKey: queryKeys.announcementComments(announcementId),
    queryFn: async () => {
      const res = await api.getAnnouncementComments(Number(announcementId));
      return mapComments((res.items as Record<string, unknown>[]) ?? [], announcementId);
    },
    refetchInterval: 30_000,
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.announcementComments(announcementId) });
  };

  const onPostComment = async (body: string, parentId?: string | null) => {
    await api.createAnnouncementComment(Number(announcementId), {
      body,
      parent_comment_id: parentId ? Number(parentId) : null,
    });
    await refresh();
  };

  const onPinComment = isFaculty
    ? async (commentId: string, pinned: boolean) => {
        await api.pinAnnouncementComment(Number(commentId), pinned);
        await refresh();
      }
    : undefined;

  return (
    <CommentThread
      postId={announcementId}
      comments={commentsQuery.data ?? []}
      onRefresh={refresh}
      onPostComment={onPostComment}
      onPinComment={onPinComment}
    />
  );
}
