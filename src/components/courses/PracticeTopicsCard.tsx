import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { encodeCourseCode } from "@/lib/blog";
import { usePracticeTopics } from "@/hooks/usePractice";

export function PracticeTopicsCard({ code }: { code: string }) {
  const { topics, loading } = usePracticeTopics(code);
  const slug = encodeCourseCode(code);

  return (
    <section className="rounded-[1.5rem] border border-[#dce5d4] bg-white p-5 shadow-[0_8px_24px_-16px_rgba(125,155,118,0.35)]">
      <header className="flex items-baseline justify-between mb-3">
        <h2 className="font-display text-xl tracking-tight text-slate-800 inline-flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#7d9b76]" />
          Practice
        </h2>
        <Link
          to="/courses/$courseCode"
          params={{ courseCode: slug }}
          className="text-[10px] uppercase tracking-[0.2em] text-[#7d9b76] font-bold hover:underline"
        >
          Open course
        </Link>
      </header>

      {loading ? (
        <p className="text-xs text-slate-500 py-4">Loading topics…</p>
      ) : topics.length === 0 ? (
        <p className="text-xs text-slate-500 py-4">No practice sets yet for this course.</p>
      ) : (
        <ul className="space-y-1.5">
          {topics.map((t) => (
            <li key={t.id}>
              <Link
                to="/courses/$courseCode"
                params={{ courseCode: slug }}
                className="w-full flex items-center gap-3 rounded-xl border border-transparent bg-[#faf8f3] hover:bg-white hover:border-[#dce5d4] px-3 py-2 text-left transition group"
              >
                <span className="text-sm font-medium text-slate-800 flex-1 truncate">{t.topic}</span>
                <span className="text-[11px] text-slate-500 tabular-nums">
                  {t.problemCount} probs
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
