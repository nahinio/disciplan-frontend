import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, FileText, Target } from "lucide-react";
import { encodeCourseCode } from "@/lib/blog";
import { sectionLabelFromKey } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";

const pillStyles = {
  resource:
    "border-emerald-200/80 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300",
  blog: "border-sky-200/80 bg-sky-50/60 text-sky-700 hover:bg-sky-50 hover:border-sky-300",
  practice:
    "border-rose-200/80 bg-rose-50/60 text-rose-600 hover:bg-rose-50 hover:border-rose-300",
} as const;

function StudyLinkPill({
  to,
  params,
  search,
  tone,
  icon,
  label,
}: {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
  tone: keyof typeof pillStyles;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      params={params}
      search={search}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        pillStyles[tone]
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

export function ExamStudyLinks({
  courseCode,
  sectionKey,
}: {
  courseCode: string;
  sectionKey?: string | null;
}) {
  const encoded = encodeCourseCode(courseCode);
  const section = sectionLabelFromKey(sectionKey);

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2.5">
      {section ? (
        <StudyLinkPill
          to="/courses/$courseCode/section"
          params={{ courseCode: encoded }}
          search={{ section, tab: "section-resources" }}
          tone="resource"
          icon={<FileText className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} />}
          label="Resource"
        />
      ) : null}
      <StudyLinkPill
        to="/courses/$courseCode"
        params={{ courseCode: encoded }}
        search={{ tab: "blogs" }}
        tone="blog"
        icon={<BookOpen className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} />}
        label="Blog"
      />
      <StudyLinkPill
        to="/courses/$courseCode"
        params={{ courseCode: encoded }}
        search={{ tab: "practice" }}
        tone="practice"
        icon={<Target className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} />}
        label="Practice"
      />
    </div>
  );
}
