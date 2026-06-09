import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { encodeCourseCode } from "@/lib/blog";
import { relativeTime } from "@/lib/blog";
import { useBlogPosts } from "@/hooks/useBlogPosts";

export function CourseBlogLinkCard({ code }: { code: string }) {
  const { posts, loading } = useBlogPosts(code, 5);
  const count = posts.length;
  const latest = posts[0];
  const slug = encodeCourseCode(code);

  return (
    <Link
      to="/blogs/$courseCode"
      params={{ courseCode: slug }}
      className="group block rounded-[1.5rem] border border-[#dce5d4] bg-white p-5 shadow-[0_8px_24px_-16px_rgba(125,155,118,0.35)] hover:shadow-[0_16px_36px_-20px_rgba(125,155,118,0.5)] transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-[#7d9b76] font-bold">
            <BookOpen className="w-3 h-3" />
            Blog
          </span>
          <p className="mt-2 font-display text-xl tracking-tight text-slate-800 leading-tight">
            {loading ? "…" : `${count} post${count === 1 ? "" : "s"}`}
          </p>
        </div>
        <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition" />
      </div>

      {latest ? (
        <div className="mt-4 pt-4 border-t border-[#dce5d4]">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Latest</p>
          <p className="mt-1 text-sm font-semibold text-slate-700 line-clamp-2 leading-snug">
            {latest.title}
          </p>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {latest.author.name} · {relativeTime(latest.createdAt)}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-xs text-slate-500">
          {loading ? "Loading posts…" : "No posts yet — be the first."}
        </p>
      )}
    </Link>
  );
}
