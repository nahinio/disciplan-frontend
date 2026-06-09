import { useMemo, useState } from "react";
import {
  Flag,
  MessageSquare,
  MoreHorizontal,
  Pin,
  Reply,
  Share2,
  ShieldCheck,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { relativeTime, score, type CommentNode } from "@/lib/blog";
import { api } from "@/lib/api";
import type { Comment } from "@/data/mockBlog";
import { RoleBadge } from "./RoleBadge";
import { VoteBar } from "./VoteBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserStats } from "@/hooks/useUserStats";
import { ReportModal } from "./ReportModal";

type SortKey = "best" | "top" | "new" | "controversial";

const sortLabel: Record<SortKey, string> = {
  best: "Best",
  top: "Top",
  new: "New",
  controversial: "Controversial",
};

function sortTree(nodes: CommentNode[], sort: SortKey): CommentNode[] {
  const cmp = (a: CommentNode, b: CommentNode) => {
    switch (sort) {
      case "top":
        return b.upvotes - a.upvotes;
      case "new":
        return b.createdAt.getTime() - a.createdAt.getTime();
      case "controversial":
        return Math.min(b.upvotes, b.downvotes) - Math.min(a.upvotes, a.downvotes);
      case "best":
      default:
        return score(b) - score(a);
    }
  };
  return [...nodes]
    .sort(cmp)
    .map((n) => ({ ...n, children: sortTree(n.children, sort) }));
}

function countDescendants(node: CommentNode): number {
  let n = node.children.length;
  for (const c of node.children) n += countDescendants(c);
  return n;
}

function buildTreeFromComments(comments: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  comments.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: CommentNode[] = [];
  comments.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export function CommentThread({
  postId,
  comments: apiComments,
  onRefresh,
  onPostComment,
  onPinComment,
}: {
  postId?: string;
  comments?: Comment[];
  onRefresh?: () => void;
  onPostComment?: (body: string, parentId?: string | null) => Promise<void>;
  onPinComment?: (commentId: string, pinned: boolean) => Promise<void>;
}) {
  const { profile } = useUserStats();
  const [, force] = useState(0);
  const [composer, setComposer] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>("best");
  const numericPostId = postId ? Number(postId) : NaN;
  const useApi = apiComments != null || onPostComment != null;

  const tree = useMemo(() => {
    if (!postId || !useApi) return [];
    const base = buildTreeFromComments(apiComments ?? []);
    return sortTree(base, sort);
  }, [postId, sort, force, apiComments, useApi]);
  const total = useMemo(() => {
    const walk = (nodes: CommentNode[]): number =>
      nodes.reduce((acc, n) => acc + 1 + walk(n.children), 0);
    return walk(tree);
  }, [tree]);

  const submitRoot = async () => {
    if (!composer.trim() || !postId || !useApi) return;
    try {
      if (onPostComment) {
        await onPostComment(composer.trim(), null);
      } else if (Number.isFinite(numericPostId)) {
        await api.commentBlogPost(numericPostId, composer.trim());
      }
      setComposer("");
      setComposerOpen(false);
      await onRefresh?.();
    } catch {
      toast.error("Could not post comment");
    }
  };

  return (
    <section id="comments" className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          {total} {total === 1 ? "Comment" : "Comments"}
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition">
            Sort by: <span className="text-foreground font-semibold">{sortLabel[sort]}</span> ▾
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <DropdownMenuRadioItem value="best">Best</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="new">New</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="controversial">Controversial</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Composer */}
      <div className="rounded-2xl border border-border bg-card p-3">
        <textarea
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          onFocus={() => setComposerOpen(true)}
          placeholder="Add a comment"
          className={`w-full resize-y bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none ${
            composerOpen || composer ? "min-h-[80px]" : "min-h-[40px]"
          }`}
        />
        {(composerOpen || composer) && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
            <span className="text-[11px] text-muted-foreground">
              Comment as <span className="font-semibold text-foreground">{profile.name}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setComposer("");
                  setComposerOpen(false);
                }}
                className="px-3 h-8 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={submitRoot}
                disabled={!composer.trim()}
                className="px-3.5 h-8 rounded-full bg-rose-600 text-white text-xs font-semibold disabled:opacity-40 hover:bg-rose-700 transition"
              >
                Comment
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1">
        {tree.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-60" />
            <p className="text-sm">No comments yet. Start the discussion.</p>
          </div>
        ) : (
          tree.map((node) => (
            <CommentItem
              key={node.id}
              node={node}
              postId={postId}
              depth={0}
              useApi={useApi}
              numericPostId={numericPostId}
              onRefresh={onRefresh}
              onPostComment={onPostComment}
              onPinComment={onPinComment}
              onChange={() => force((n) => n + 1)}
            />
          ))
        )}
      </div>
    </section>
  );
}

const MAX_INDENT_DEPTH = 6;

function CommentItem({
  node,
  postId,
  depth,
  onChange,
  useApi,
  numericPostId,
  onRefresh,
  onPostComment,
  onPinComment,
}: {
  node: CommentNode;
  postId?: string;
  depth: number;
  onChange: () => void;
  useApi?: boolean;
  numericPostId?: number;
  onRefresh?: () => void;
  onPostComment?: (body: string, parentId?: string | null) => Promise<void>;
  onPinComment?: (commentId: string, pinned: boolean) => Promise<void>;
}) {
  const { profile } = useUserStats();
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [isReportOpen, setIsReportOpen] = useState(false);

  const handleReportSubmit = async (reason: string, details: string) => {
    if (!useApi || !Number.isFinite(Number(node.id))) {
      toast.error("Cannot report this comment.");
      return;
    }
    try {
      await api.submitContentReport({
        entity_type_code: "blog_comment",
        entity_id: Number(node.id),
        reason_code: reason,
        notes: details.trim() || undefined,
      });
      node.reported = true;
      node.reportReason = reason;
      node.reportDetails = details;
      toast.success("Comment reported. It has been sent to moderation.");
      onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit report.");
    }
  };

  const submitReply = async () => {
    if (!reply.trim() || !postId || !useApi) return;
    try {
      if (onPostComment) {
        await onPostComment(reply.trim(), node.id);
      } else if (Number.isFinite(numericPostId)) {
        await api.commentBlogPost(numericPostId, reply.trim(), Number(node.id));
      }
      setReply("");
      setReplying(false);
      await onRefresh?.();
    } catch {
      toast.error("Could not post reply");
    }
  };

  const effectiveDepth = Math.min(depth, MAX_INDENT_DEPTH);

  return (
    <div className="py-1.5">
      {/* Header */}
      <button
        onClick={() => collapsed && setCollapsed(false)}
        className="flex items-center gap-2 text-xs w-full text-left"
      >
        {collapsed && (
          <span className="text-muted-foreground font-mono text-[11px]">[+]</span>
        )}
        <span className="grid place-items-center w-6 h-6 rounded-full bg-muted text-[10px] font-semibold text-foreground shrink-0">
          {node.author.initials}
        </span>
        <span className="font-semibold text-foreground inline-flex items-center gap-1.5 flex-wrap">
          {node.author.name}
          <RoleBadge role={node.author.role} name={node.author.name} />
        </span>
        {postId?.startsWith("dbt-") && (node.isVerified || node.author.role === "faculty") && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-200/50 shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            Verified Answer
          </span>
        )}
        <span className="text-muted-foreground">· {relativeTime(node.createdAt)}</span>
        {collapsed && node.children.length > 0 && (
          <span className="text-muted-foreground">
            · {countDescendants(node)} {countDescendants(node) === 1 ? "reply" : "replies"}
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="flex mt-1">
          {/* Collapsible rail */}
          <button
            onClick={() => setCollapsed(true)}
            aria-label="Collapse thread"
            className="shrink-0 w-6 flex justify-center group"
          >
            <span className="w-px bg-border group-hover:bg-rose-400 transition-colors h-full" />
          </button>

          <div className="flex-1 min-w-0 pl-1">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {node.body}
            </p>

            <div className="mt-1.5 flex items-center gap-0.5 text-muted-foreground">
              <VoteBar target={node} variant="inline" />
              <button
                onClick={() => setReplying((r) => !r)}
                className="inline-flex items-center gap-1 px-2 h-7 rounded text-xs font-semibold hover:bg-muted hover:text-foreground"
              >
                <Reply className="w-3.5 h-3.5" />
                Reply
              </button>
              {onPinComment &&
                (profile.role === "faculty" || profile.role === "admin") && (
                  <button
                    onClick={async () => {
                      try {
                        await onPinComment(node.id, !node.isVerified);
                        toast.success(node.isVerified ? "Comment unpinned" : "Comment pinned");
                        await onRefresh?.();
                        onChange();
                      } catch {
                        toast.error("Could not update pin");
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 h-7 rounded text-xs font-semibold hover:bg-muted hover:text-foreground"
                  >
                    <Pin className="w-3.5 h-3.5" />
                    {node.isVerified ? "Unpin" : "Pin"}
                  </button>
                )}
              {profile.role === "admin" && node.author.name !== "[removed]" && (
                <button
                  onClick={() => {
                    toast.error("Comment deletion is not available via API yet.");
                  }}
                  className="inline-flex items-center gap-1 px-2 h-7 rounded text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
              {profile.role !== "admin" && node.author.name !== "[removed]" && (
                <button
                  onClick={() => setIsReportOpen(true)}
                  className="inline-flex items-center gap-1 px-2 h-7 rounded text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Report
                </button>
              )}
            </div>

            {replying && (
              <div className="mt-2 rounded-xl border border-border bg-card p-3">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={`Reply to ${node.author.name}…`}
                  className="w-full min-h-[60px] resize-y bg-transparent text-sm focus:outline-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-1.5">
                  <button
                    onClick={() => {
                      setReplying(false);
                      setReply("");
                    }}
                    className="px-3 h-8 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitReply}
                    disabled={!reply.trim()}
                    className="px-3 h-8 rounded-full bg-rose-600 text-white text-xs font-semibold disabled:opacity-40 hover:bg-rose-700"
                  >
                    Reply
                  </button>
                </div>
              </div>
            )}

            {node.children.length > 0 && (
              <div className={effectiveDepth < MAX_INDENT_DEPTH ? "mt-1" : "mt-1"}>
                {node.children.map((child) => (
                  <CommentItem
                    key={child.id}
                    node={child}
                    postId={postId}
                    depth={depth + 1}
                    useApi={useApi}
                    numericPostId={numericPostId}
                    onRefresh={onRefresh}
                    onPostComment={onPostComment}
                    onPinComment={onPinComment}
                    onChange={onChange}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onSubmit={handleReportSubmit}
        itemType="comment"
      />
    </div>
  );
}
