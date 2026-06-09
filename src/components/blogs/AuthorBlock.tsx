import { Clock } from "lucide-react";
import type { Author } from "@/data/mockBlog";
import { relativeTime } from "@/lib/blog";
import { RoleBadge } from "./RoleBadge";
import { DisciPlanLogo } from "@/components/DisciPlanLogo";

export function AuthorBlock({
  author,
  createdAt,
  courseCode,
  readTimeMin,
  size = "sm",
}: {
  author: Author;
  createdAt: Date;
  courseCode?: string;
  readTimeMin?: number;
  size?: "sm" | "md";
}) {
  const isAdmin = author.role === "admin";
  const displayName = isAdmin ? "DisciPlan" : author.name;

  const avatarCls =
    size === "md" ? "w-9 h-9 text-[12px]" : "w-8 h-8 text-[11px]";

  return (
    <div className="flex items-center gap-2.5 text-xs">
      {isAdmin ? (
        <span
          className={`${avatarCls} grid place-items-center rounded-full text-foreground`}
          aria-hidden
        >
          <DisciPlanLogo size="lg" className="w-full h-full rounded-full" alt="" />
        </span>
      ) : (
        <span
          className={`${avatarCls} grid place-items-center rounded-full bg-muted font-semibold text-foreground`}
        >
          {author.initials}
        </span>
      )}
      <div className="flex flex-col leading-tight">
        <span className="font-semibold text-foreground inline-flex items-center gap-1.5 flex-wrap">
          {displayName}
          <RoleBadge role={author.role} name={author.name} />
        </span>
        <span className="text-muted-foreground inline-flex items-center gap-1.5 flex-wrap">
          {!isAdmin && <span>{relativeTime(createdAt)}</span>}
          {!isAdmin && courseCode && <span>·</span>}
          {courseCode && (
            <span className="font-mono text-rose-600">{courseCode}</span>
          )}
          {readTimeMin != null && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {readTimeMin} min read
              </span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
