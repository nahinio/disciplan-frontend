import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CommentThread } from "@/components/blogs/CommentThread";
import { useUserStats } from "@/hooks/useUserStats";
import type { Comment } from "@/data/mockBlog";

export function AnnouncementComments({ announcementId }: { announcementId: string }) {
  const { profile } = useUserStats();
  const [comments, setComments] = useState<Comment[]>([]);
  const isFaculty = profile.role === "faculty" || profile.role === "admin";

  const refresh = useCallback(async () => {
    try {
      const res = await api.getAnnouncementComments(Number(announcementId));
      setComments(
        (res.items as Record<string, unknown>[]).map((c) => ({
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
        }))
      );
    } catch {
      setComments([]);
    }
  }, [announcementId]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 8000);
    return () => clearInterval(t);
  }, [refresh]);

  const onPostComment = async (body: string, parentId?: string | null) => {
    await api.createAnnouncementComment(Number(announcementId), {
      body,
      parent_comment_id: parentId ? Number(parentId) : null,
    });
  };

  const onPinComment = isFaculty
    ? async (commentId: string, pinned: boolean) => {
        await api.pinAnnouncementComment(Number(commentId), pinned);
      }
    : undefined;

  return (
    <CommentThread
      postId={announcementId}
      comments={comments}
      onRefresh={refresh}
      onPostComment={onPostComment}
      onPinComment={onPinComment}
    />
  );
}
