import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, MessageSquare } from "lucide-react";
import { encodeCourseCode } from "@/lib/blog";
import { useBlogPosts } from "@/hooks/useBlogPosts";

export function CourseTile({
  code,
  title,
  credit,
  department,
  highlight,
}: {
  code: string;
  title: string;
  credit?: number;
  department?: string;
  highlight?: boolean;
}) {
  const { posts } = useBlogPosts(code, 5);
  const count = posts.length;
  const latest = posts[0];
  const slug = encodeCourseCode(code);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to="/blogs/$courseCode"
        params={{ courseCode: slug }}
        className={`group block rounded-2xl border bg-card p-4 hover:shadow-md transition-shadow ${highlight ? "border-rose-200" : "border-border"}`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-semibold text-rose-600">{code}</span>
          {credit !== undefined && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {credit} cr
            </span>
          )}
          {department && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {department}
            </span>
          )}
          <ArrowUpRight className="w-4 h-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
        </div>
        <h3 className="mt-1.5 font-display text-base font-semibold tracking-tight leading-snug text-foreground">
          {title}
        </h3>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <MessageSquare className="w-3 h-3" />
          <span>
            {count} post{count === 1 ? "" : "s"}
          </span>
          {latest && (
            <span className="truncate">· latest: <span className="text-foreground">{latest.title}</span></span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
