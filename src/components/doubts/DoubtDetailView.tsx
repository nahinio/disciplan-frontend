import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  mapDoubtDetail,
  isDoubtResolved,
  sortAnswersWithOfficialFirst,
} from "@/lib/doubtForum";
import { encodeCourseCode } from "@/lib/blog";
import { queryKeys } from "@/lib/queryKeys";
import { useUserStats } from "@/hooks/useUserStats";
import { cn } from "@/lib/utils";
import { RefreshButton } from "@/components/ui/refresh-button";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { invalidateDoubtsData } from "@/lib/invalidateAppData";

export function DoubtDetailView({ doubtId }: { doubtId: number }) {
  const { profile } = useUserStats();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const isFaculty = profile.role === "faculty" || profile.role === "admin";

  const detailQuery = useQuery({
    queryKey: queryKeys.doubts.detail(doubtId),
    queryFn: async () => {
      const res = await api.getDoubt(doubtId);
      return mapDoubtDetail(res);
    },
  });

  const { refresh: refreshDoubt, isRefreshing } = usePageRefresh(async () => {
    const doubt = detailQuery.data;
    await invalidateDoubtsData(
      qc,
      doubt?.courseCode,
      doubt?.sectionLabel
    );
    await detailQuery.refetch();
  });

  const postComment = useMutation({
    mutationFn: async () => {
      await api.answerDoubt(doubtId, {
        body: comment.trim(),
        parent_answer_id: replyToId,
      });
    },
    onSuccess: async () => {
      toast.success(isFaculty ? "Answer published." : "Comment posted.");
      setComment("");
      setReplyToId(null);
      await qc.invalidateQueries({ queryKey: queryKeys.doubts.detail(doubtId) });
      await qc.invalidateQueries({ queryKey: ["doubts", "search"] });
    },
    onError: () => toast.error("Could not post comment"),
  });

  const acceptAnswer = useMutation({
    mutationFn: (answerId: number) => api.acceptDoubtAnswer(answerId),
    onSuccess: async (res) => {
      toast.success("Official solution accepted.");
      const unlocked = (res.new_achievements as { label?: string }[]) ?? [];
      for (const a of unlocked) {
        if (a.label) toast.success(`${a.label} unlocked!`);
      }
      await qc.invalidateQueries({ queryKey: queryKeys.doubts.detail(doubtId) });
      await qc.invalidateQueries({ queryKey: ["doubts", "search"] });
    },
    onError: () => toast.error("Could not accept answer as official solution"),
  });

  const markSolved = useMutation({
    mutationFn: () => api.verifyDoubt(doubtId),
    onSuccess: async () => {
      toast.success("Doubt marked as solved.");
      await qc.invalidateQueries({ queryKey: queryKeys.doubts.detail(doubtId) });
      await qc.invalidateQueries({ queryKey: ["doubts", "search"] });
    },
    onError: () => toast.error("Could not mark as solved"),
  });

  if (detailQuery.isPending) {
    return <p className="text-sm text-muted-foreground py-10 text-center">Loading doubt…</p>;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="py-10 text-center space-y-3">
        <p className="text-sm text-muted-foreground">This doubt is unavailable or you lack access.</p>
        <Link to="/doubts" className="text-sm font-semibold text-rose-600 hover:underline">
          Back to Doubts
        </Link>
      </div>
    );
  }

  const doubt = detailQuery.data;
  const resolved = isDoubtResolved(doubt);
  const orderedAnswers = sortAnswersWithOfficialFirst(doubt.answers, doubt.acceptedAnswerId);
  const topLevel = orderedAnswers.filter((a) => !a.parentAnswerId);
  const childrenOf = (parentId: number) =>
    orderedAnswers.filter((a) => a.parentAnswerId === parentId);

  return (
    <div className="space-y-6">
      <Link
        to="/doubts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        All doubts
      </Link>

      <article className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded">
              {doubt.courseCode} · Sec {doubt.sectionLabel}
            </span>
            {resolved && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 uppercase tracking-wider">
                <CheckCircle2 className="w-3 h-3" />
                Resolved
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <RefreshButton onClick={refreshDoubt} loading={isRefreshing || detailQuery.isFetching} />
            <Link
              to="/courses/$courseCode/section"
              params={{ courseCode: encodeCourseCode(doubt.courseCode) }}
              search={{ section: doubt.sectionLabel, tab: "doubts", doubtId: String(doubt.id) }}
              className="text-[10px] font-bold text-muted-foreground hover:text-rose-600 uppercase tracking-wider"
            >
              Open in section hub →
            </Link>
          </div>
        </div>

        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {doubt.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {doubt.authorName} · {doubt.createdAt.toLocaleString()}
          </p>
          <p className="text-sm text-foreground/85 mt-4 whitespace-pre-wrap leading-relaxed">
            {doubt.body}
          </p>
        </div>
      </article>

      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Answers & comments ({doubt.answers.length})
        </h2>

        {topLevel.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4">No responses yet.</p>
        ) : (
          <div className="space-y-3">
            {topLevel.map((ans) => (
              <div key={ans.id} className="space-y-2">
                <AnswerBlock
                  answer={ans}
                  isFaculty={isFaculty}
                  isOfficial={doubt.acceptedAnswerId === ans.id}
                  canAccept={
                    isFaculty &&
                    !resolved &&
                    ans.authorRole === "student" &&
                    !ans.isFacultyEndorsed
                  }
                  onReply={() => setReplyToId(ans.id)}
                  onAccept={() => acceptAnswer.mutate(ans.id)}
                />
                {childrenOf(ans.id).map((child) => (
                  <div key={child.id} className="ml-6 pl-4 border-l-2 border-border">
                    <AnswerBlock
                      answer={child}
                      isFaculty={isFaculty}
                      isOfficial={doubt.acceptedAnswerId === child.id}
                      canAccept={
                        isFaculty &&
                        !resolved &&
                        child.authorRole === "student" &&
                        !child.isFacultyEndorsed
                      }
                      onReply={() => setReplyToId(child.id)}
                      onAccept={() => acceptAnswer.mutate(child.id)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!comment.trim()) return;
          postComment.mutate();
        }}
        className="rounded-2xl border border-border bg-card p-4 space-y-3"
      >
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {replyToId ? "Reply to comment" : isFaculty ? "Post verified answer" : "Add a comment"}
        </h3>
        {replyToId && (
          <button
            type="button"
            onClick={() => setReplyToId(null)}
            className="text-[10px] font-semibold text-rose-600 hover:underline"
          >
            Cancel reply
          </button>
        )}
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            isFaculty
              ? "Write an official clarification for students…"
              : "Share your thoughts or ask a follow-up…"
          }
          className="w-full p-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none"
        />
        <div className="flex justify-end gap-2">
          {isFaculty && !resolved && (
            <button
              type="button"
              onClick={() => markSolved.mutate()}
              disabled={markSolved.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-50 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark solved
            </button>
          )}
          <button
            type="submit"
            disabled={!comment.trim() || postComment.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {isFaculty ? "Publish" : "Comment"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AnswerBlock({
  answer,
  isFaculty,
  isOfficial,
  canAccept,
  onReply,
  onAccept,
}: {
  answer: {
    id: number;
    body: string;
    authorName: string;
    authorRole: string;
    isFacultyAnswer: boolean;
    isFacultyEndorsed: boolean;
    createdAt: Date;
  };
  isFaculty: boolean;
  isOfficial: boolean;
  canAccept: boolean;
  onReply: () => void;
  onAccept: () => void;
}) {
  return (
    <div
      className={cn(
        "p-3 rounded-xl border text-sm",
        isOfficial
          ? "bg-emerald-50/60 border-emerald-200 ring-1 ring-emerald-100"
          : "bg-muted/40 border-border"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
        <span className="font-bold text-foreground text-xs">
          {answer.authorName}{" "}
          <span className="text-muted-foreground font-medium">({answer.authorRole})</span>
        </span>
        <div className="flex items-center gap-1.5">
          {isOfficial && (
            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 font-extrabold uppercase tracking-wider">
              Official solution
            </span>
          )}
          {answer.isFacultyEndorsed && !isOfficial && (
            <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 font-extrabold uppercase tracking-wider">
              Faculty endorsed
            </span>
          )}
          {answer.isFacultyAnswer && (
            <span className="text-[9px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded border border-sky-100 font-extrabold uppercase tracking-wider">
              Faculty answer
            </span>
          )}
          {canAccept && (
            <button
              type="button"
              onClick={onAccept}
              className="text-[9px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100 font-extrabold uppercase tracking-wider hover:bg-rose-100"
            >
              Accept as official solution
            </button>
          )}
          <button
            type="button"
            onClick={onReply}
            className={cn(
              "text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-rose-600"
            )}
          >
            Reply
          </button>
        </div>
      </div>
      <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{answer.body}</p>
      <p className="text-[10px] text-muted-foreground mt-2">{answer.createdAt.toLocaleString()}</p>
    </div>
  );
}
