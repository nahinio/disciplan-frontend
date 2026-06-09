import { BadgeCheck, Shield } from "lucide-react";
import type { AuthorRole } from "@/data/mockBlog";

export function RoleBadge({ role }: { role: AuthorRole; name?: string }) {
  if (role === "faculty") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
        <BadgeCheck className="w-3 h-3 text-rose-600 dark:text-rose-400" />
        Faculty
      </span>
    );
  }

  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border border-border">
        <Shield className="w-3 h-3" />
        Admin
      </span>
    );
  }

  if (role === "student") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
        Student
      </span>
    );
  }

  return null;
}
