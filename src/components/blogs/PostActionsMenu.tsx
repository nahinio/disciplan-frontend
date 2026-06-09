import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pin, PinOff, Link2, Flag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { type BlogPost } from "@/data/mockBlog";
import { api } from "@/lib/api";
import { invalidateCourseContent } from "@/lib/invalidateAppData";
import { ReportModal } from "./ReportModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserStats } from "@/hooks/useUserStats";

export function PostActionsMenu({ post, href }: { post: BlogPost; href: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useUserStats();
  const isAdmin = post.author.role === "admin";
  const isCurrentUserAdmin = profile.role === "admin";
  const [isReportOpen, setIsReportOpen] = useState(false);

  const handleReportSubmit = async (reason: string, details: string) => {
    try {
      await api.submitContentReport({
        entity_type_code: "blog_post",
        entity_id: Number(post.id),
        reason_code: reason,
        notes: details.trim() || undefined,
      });
      toast.success("Report submitted for moderation.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit report.");
    }
  };

  return (
    <>
      <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Post actions"
        className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
      >
        <MoreHorizontal className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {profile.role === "admin" && (
          (post.isPinned || (post.author.role === "admin" && post.isPinned !== false)) ? (
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await api.pinBlogPost(Number(post.id), false);
                  await invalidateCourseContent(qc, post.courseCode);
                  toast.success("Post unpinned");
                } catch {
                  toast.error("Could not unpin");
                }
              }}
            >
              <PinOff className="w-4 h-4" />
              Unpin post
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await api.pinBlogPost(Number(post.id), true);
                  await invalidateCourseContent(qc, post.courseCode);
                  toast.success("Post pinned");
                } catch {
                  toast.error("Could not pin");
                }
              }}
            >
              <Pin className="w-4 h-4" />
              Pin post
            </DropdownMenuItem>
          )
        )}
        <DropdownMenuItem
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.origin + href);
              toast.success("Link copied");
            } catch {
              toast.error("Could not copy link");
            }
          }}
        >
          <Link2 className="w-4 h-4" />
          Copy link
        </DropdownMenuItem>
        {!isCurrentUserAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setIsReportOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Flag className="w-4 h-4" />
              Report
            </DropdownMenuItem>
          </>
        )}
        {isCurrentUserAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                if (!confirm("Are you sure you want to delete this blog post?")) return;
                try {
                  await api.deleteBlogPost(Number(post.id));
                  await invalidateCourseContent(qc, post.courseCode);
                  toast.success("Blog post deleted.");
                  void navigate({ to: "/blogs" });
                } catch {
                  toast.error("Could not delete post");
                }
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Delete Post
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>

    <ReportModal
      isOpen={isReportOpen}
      onClose={() => setIsReportOpen(false)}
      onSubmit={handleReportSubmit}
      itemType="post"
    />
    </>
  );
}
