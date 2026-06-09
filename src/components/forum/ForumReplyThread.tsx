import { useMemo, useState } from "react";
import { ChevronUp, Flag, Loader2, Pencil, Reply, Trash2 } from "lucide-react";
import { ReportModal } from "@/components/blogs/ReportModal";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/blog";
import { cn } from "@/lib/utils";
import type { ForumReply } from "@/lib/mappers";
import { useUserStats } from "@/hooks/useUserStats";

interface ReplyNode extends ForumReply {
  children: ReplyNode[];
}

function buildTree(replies: ForumReply[]): ReplyNode[] {
  const map = new Map<string, ReplyNode>();
  replies.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: ReplyNode[] = [];
  replies.forEach((r) => {
    const node = map.get(r.id)!;
    if (r.parentId && map.has(r.parentId)) {
      map.get(r.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

const ROLE_DOT: Record<"student" | "cr" | "faculty", string> = {
  student: "bg-[#7d9b76]",
  cr: "bg-sky-500",
  faculty: "bg-rose-500",
};

export function ForumReplyThread({
  threadId,
  replies,
  currentUserId,
  isAdmin,
  onRefresh,
}: {
  threadId: number;
  replies: ForumReply[];
  currentUserId: number;
  isAdmin: boolean;
  onRefresh: () => void;
}) {
  const { profile } = useUserStats();
  const [composer, setComposer] = useState("");
  const [posting, setPosting] = useState(false);
  const tree = useMemo(() => buildTree(replies), [replies]);

  const submitRoot = async () => {
    if (!composer.trim()) return;
    setPosting(true);
    try {
      await api.replyForumThread(threadId, composer.trim());
      setComposer("");
      await onRefresh();
      toast.success("Reply posted");
    } catch {
      toast.error("Could not post reply");
    } finally {
      setPosting(false);
    }
  };

  return (
    <section className="space-y-4">
      <h3 className="font-display text-base font-semibold tracking-tight text-slate-800">
        {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
      </h3>

      <div className="rounded-2xl border border-[#dce5d4] bg-[#fafcf8] p-4">
        <textarea
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          placeholder="Write a reply…"
          rows={3}
          className="w-full resize-none bg-transparent text-sm text-slate-800 focus:outline-none placeholder:text-slate-400"
        />
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#dce5d4]">
          <span className="text-[11px] text-slate-500">
            Replying as{" "}
            <span className="font-semibold text-slate-700">{profile.name}</span>
          </span>
          <button
            type="button"
            onClick={() => void submitRoot()}
            disabled={!composer.trim() || posting}
            className="inline-flex items-center gap-1.5 px-4 h-8 rounded-full bg-[#7d9b76] text-white text-xs font-semibold disabled:opacity-40 hover:bg-[#6b8865] transition"
          >
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Reply
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {tree.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center rounded-xl border border-dashed border-[#dce5d4]">
            No replies yet — be the first to help.
          </p>
        ) : (
          tree.map((node) => (
            <ReplyItem
              key={node.id}
              node={node}
              threadId={threadId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onRefresh={onRefresh}
              depth={0}
            />
          ))
        )}
      </div>
    </section>
  );
}

function ReplyItem({
  node,
  threadId,
  currentUserId,
  isAdmin,
  onRefresh,
  depth,
}: {
  node: ReplyNode;
  threadId: number;
  currentUserId: number;
  isAdmin: boolean;
  onRefresh: () => void;
  depth: number;
}) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const isOwn = currentUserId > 0 && node.authorUserId === currentUserId;
  const canEdit = isOwn;
  const canDelete = isOwn || isAdmin;
  const canReport =
    currentUserId > 0 && node.authorUserId !== currentUserId && !isAdmin;

  const submitReply = async () => {
    if (!reply.trim()) return;
    setPosting(true);
    try {
      await api.replyForumThread(threadId, reply.trim(), Number(node.id));
      setReply("");
      setReplying(false);
      await onRefresh();
      toast.success("Reply posted");
    } catch {
      toast.error("Could not post reply");
    } finally {
      setPosting(false);
    }
  };

  const deleteReply = async () => {
    if (!confirm("Delete your reply?")) return;
    setDeleting(true);
    try {
      await api.deleteForumReply(Number(node.id));
      await onRefresh();
      toast.success("Reply deleted");
    } catch {
      toast.error("Could not delete reply");
    } finally {
      setDeleting(false);
    }
  };

  const saveEdit = async () => {
    if (!editBody.trim()) return;
    setSavingEdit(true);
    try {
      await api.updateForumReply(Number(node.id), editBody.trim());
      setEditing(false);
      await onRefresh();
      toast.success("Reply updated");
    } catch {
      toast.error("Could not update reply");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className={depth > 0 ? "ml-4 sm:ml-6 border-l-2 border-[#eef2e8] pl-4" : ""}>
      <div className="py-3 group">
        <div className="flex items-start gap-2">
          <span
            className={cn(
              "grid place-items-center w-7 h-7 rounded-full text-white text-[10px] font-bold shrink-0 mt-0.5",
              ROLE_DOT[node.author.role]
            )}
          >
            {node.author.initials}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-800">{node.author.name}</span>
              <span className="text-[10px] text-slate-400">{relativeTime(node.createdAt)}</span>
              {node.upvotes > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600">
                  <ChevronUp className="w-3 h-3" />
                  {node.upvotes}
                </span>
              )}
            </div>
            {editing ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-[#dce5d4] bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7d9b76]/30"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setEditBody("");
                    }}
                    className="px-3 h-7 rounded-full text-xs text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingEdit || !editBody.trim()}
                    onClick={() => void saveEdit()}
                    className="inline-flex items-center gap-1 px-3 h-7 rounded-full bg-[#7d9b76] text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {node.body}
              </p>
            )}
            <div className="mt-2 flex items-center gap-3 opacity-80 group-hover:opacity-100 transition">
              <button
                type="button"
                onClick={() => setReplying((r) => !r)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#7d9b76]"
              >
                <Reply className="w-3.5 h-3.5" />
                Reply
              </button>
              {canReport && (
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-rose-600"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Report
                </button>
              )}
              {canEdit && !editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditBody(node.body);
                    setEditing(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-[#7d9b76]"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void deleteReply()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-rose-600 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deleting ? "…" : "Delete"}
                </button>
              )}
            </div>
          </div>
        </div>

        <ReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          itemType="comment"
          onSubmit={async (reason, details) => {
            try {
              await api.submitContentReport({
                entity_type_code: "forum_reply",
                entity_id: Number(node.id),
                reason_code: reason,
                notes: details.trim() || undefined,
              });
              toast.success("Reply reported for moderation.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not submit report.");
            }
          }}
        />

        {replying && (
          <div className="mt-3 ml-9 space-y-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className="w-full min-h-[64px] rounded-xl border border-[#dce5d4] bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7d9b76]/30"
              autoFocus
              placeholder="Write a reply…"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setReplying(false);
                  setReply("");
                }}
                className="px-3 h-8 rounded-full text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitReply()}
                disabled={!reply.trim() || posting}
                className="inline-flex items-center gap-1 px-4 h-8 rounded-full bg-[#7d9b76] text-white text-xs font-semibold disabled:opacity-40"
              >
                {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Post
              </button>
            </div>
          </div>
        )}
      </div>

      {node.children.map((child) => (
        <ReplyItem
          key={child.id}
          node={child}
          threadId={threadId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onRefresh={onRefresh}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}
