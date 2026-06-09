import { Link } from "@tanstack/react-router";
import { CheckCircle2, MessageSquare } from "lucide-react";
import type { DoubtSearchItem } from "@/lib/doubtForum";
import { isDoubtResolved } from "@/lib/doubtForum";
import { cn } from "@/lib/utils";

export function DoubtCard({ doubt }: { doubt: DoubtSearchItem }) {
  const resolved = isDoubtResolved(doubt);

  return (
    <Link
      to="/doubts/$doubtId"
      params={{ doubtId: String(doubt.id) }}
      className={cn(
        "block p-4 rounded-2xl border bg-card hover:shadow-md transition group",
        resolved ? "border-emerald-200/80" : "border-border hover:border-rose-200"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded">
          {doubt.courseCode} · Sec {doubt.sectionLabel}
        </span>
        {resolved && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 uppercase tracking-wider shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            Resolved
          </span>
        )}
      </div>

      <h3 className="font-display text-base font-semibold text-foreground mt-2.5 line-clamp-2 group-hover:text-rose-700 transition-colors">
        {doubt.title}
      </h3>
      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{doubt.body}</p>

      <div className="flex items-center justify-between mt-4 pt-2 border-t border-border/60 text-[10px] text-muted-foreground font-semibold">
        <span>{doubt.authorName}</span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          {doubt.answerCount} repl{doubt.answerCount === 1 ? "y" : "ies"}
        </span>
      </div>
    </Link>
  );
}
