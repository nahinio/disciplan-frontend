import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, MessageSquare, Share2 } from "lucide-react";
import { score } from "@/lib/blog";
import { api } from "@/lib/api";
import { toast } from "sonner";

const TACTILE =
  "bg-gradient-to-b from-card to-muted/60 shadow-sm ring-1 ring-inset ring-white/50 dark:ring-white/5 border border-border transition active:translate-y-px active:shadow-none";

type VoteCounts = { upvotes: number; downvotes: number };

function applyVote(
  counts: VoteCounts,
  dir: "up" | "down" | "clear",
  prev: "up" | "down" | null
): { counts: VoteCounts; my: "up" | "down" | null } {
  const next = { ...counts };
  if (prev === "up") next.upvotes = Math.max(0, next.upvotes - 1);
  if (prev === "down") next.downvotes = Math.max(0, next.downvotes - 1);
  if (dir === "up") {
    next.upvotes += 1;
    return { counts: next, my: "up" };
  }
  if (dir === "down") {
    next.downvotes += 1;
    return { counts: next, my: "down" };
  }
  return { counts: next, my: null };
}

export function VoteBar({
  target,
  postId,
  initialVote,
  commentCount,
  onComment,
  shareUrl,
  size = "sm",
  shareSlot = "inline",
  variant = "pill",
  onVoteChange,
}: {
  target: VoteCounts;
  postId?: number;
  initialVote?: "up" | "down" | null;
  commentCount?: number;
  onComment?: () => void;
  shareUrl?: string;
  size?: "sm" | "md";
  shareSlot?: "inline" | "end";
  variant?: "pill" | "inline";
  onVoteChange?: () => void;
}) {
  const [counts, setCounts] = useState<VoteCounts>({
    upvotes: target.upvotes,
    downvotes: target.downvotes,
  });
  const [my, setMy] = useState<"up" | "down" | null>(initialVote ?? null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    setCounts({ upvotes: target.upvotes, downvotes: target.downvotes });
    setMy(initialVote ?? null);
  }, [target.upvotes, target.downvotes, initialVote, postId]);

  const click = async (dir: "up" | "down") => {
    if (voting) return;
    const next = my === dir ? "clear" : dir;

    if (!postId) {
      const res = applyVote(counts, next, my);
      setCounts(res.counts);
      setMy(res.my);
      return;
    }

    setVoting(true);
    try {
      const res = await api.voteBlogPost(postId, dir);
      const upvotes = Number(res.upvotes ?? counts.upvotes);
      const downvotes = Number(res.downvotes ?? counts.downvotes);
      const viewerVote =
        res.viewer_vote === "up" || res.viewer_vote === "down"
          ? res.viewer_vote
          : null;
      setCounts({ upvotes, downvotes });
      setMy(viewerVote);
      onVoteChange?.();
    } catch {
      toast.error("Could not register vote");
    } finally {
      setVoting(false);
    }
  };

  const cls = size === "md" ? "text-sm h-9 px-3" : "text-xs h-8 px-2.5";

  if (variant === "inline") {
    const scoreColor =
      my === "up" ? "text-rose-600" : my === "down" ? "text-sky-600" : "text-foreground";
    return (
      <div className="inline-flex items-center gap-0.5 text-muted-foreground">
        <button
          type="button"
          aria-label="Upvote"
          disabled={voting}
          onClick={() => void click("up")}
          className={`h-7 w-7 grid place-items-center rounded hover:bg-rose-50/70 hover:text-rose-600 disabled:opacity-50 ${my === "up" ? "text-rose-600" : ""}`}
        >
          <ArrowUp className="w-4 h-4" strokeWidth={2.25} />
        </button>
        <span className={`min-w-[1.5ch] text-center text-xs font-semibold tabular-nums ${scoreColor}`}>
          {score(counts)}
        </span>
        <button
          type="button"
          aria-label="Downvote"
          disabled={voting}
          onClick={() => void click("down")}
          className={`h-7 w-7 grid place-items-center rounded hover:bg-sky-50/70 hover:text-sky-600 disabled:opacity-50 ${my === "down" ? "text-sky-600" : ""}`}
        >
          <ArrowDown className="w-4 h-4" strokeWidth={2.25} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div className={`inline-flex items-center rounded-full ${TACTILE}`}>
        <button
          type="button"
          aria-label="Upvote"
          disabled={voting}
          onClick={() => void click("up")}
          className={`${cls} inline-flex items-center gap-1 rounded-l-full hover:bg-rose-50/70 disabled:opacity-50 ${
            my === "up" ? "text-rose-600 bg-rose-50" : "text-muted-foreground"
          }`}
        >
          <ArrowUp className="w-4 h-4" strokeWidth={2.25} />
        </button>
        <span
          className={`px-1.5 text-xs font-bold tabular-nums min-w-[2ch] text-center ${
            my === "up" ? "text-rose-600" : my === "down" ? "text-sky-600" : "text-foreground"
          }`}
        >
          {score(counts)}
        </span>
        <button
          type="button"
          aria-label="Downvote"
          disabled={voting}
          onClick={() => void click("down")}
          className={`${cls} inline-flex items-center gap-1 rounded-r-full hover:bg-sky-50/70 disabled:opacity-50 ${
            my === "down" ? "text-sky-600 bg-sky-50" : "text-muted-foreground"
          }`}
        >
          <ArrowDown className="w-4 h-4" strokeWidth={2.25} />
        </button>
      </div>
      {onComment && (
        <button
          type="button"
          onClick={onComment}
          className={`${cls} inline-flex items-center gap-1.5 rounded-full text-muted-foreground hover:text-foreground hover:-translate-y-px ${TACTILE}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="font-semibold">{commentCount ?? 0}</span>
        </button>
      )}
      {shareUrl && shareSlot === "inline" && (
        <ShareButton shareUrl={shareUrl} cls={cls} />
      )}
    </div>
  );
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through */
    }
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export function ShareButton({
  shareUrl,
  cls = "text-xs h-8 px-2.5",
}: {
  shareUrl: string;
  cls?: string;
}) {
  const share = async () => {
    const path = shareUrl.startsWith("http") ? shareUrl : `${window.location.origin}${shareUrl}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ url: path, title: document.title });
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }

    if (await copyTextToClipboard(path)) {
      toast.success("Link copied to clipboard");
      return;
    }
    toast.error("Could not copy link");
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      className={`${cls} inline-flex items-center gap-1.5 rounded-full text-muted-foreground hover:text-foreground hover:-translate-y-px ${TACTILE}`}
    >
      <Share2 className="w-3.5 h-3.5" />
      Share
    </button>
  );
}
