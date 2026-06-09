import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { MapPin, MoreHorizontal, Pin, MessageSquare } from "lucide-react";
import type { CourseOffering } from "@/types/course";
import { pendingTasksFor, nextClassLabel } from "@/lib/courseTasks";
import { useTasks } from "@/hooks/useTasks";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { courseKey, useCoursePref } from "@/lib/coursePrefs";
import { courseAccentStyles } from "@/lib/courseAccent";
import { encodeCourseCode } from "@/lib/blog";
import { cn } from "@/lib/utils";
import { useUserStats } from "@/hooks/useUserStats";

export function CourseCard({ offering }: { offering: CourseOffering }) {
  const { profile } = useUserStats();
  const { todayTasks } = useTasks();
  const isFaculty = profile.role === "faculty";
  const pending = pendingTasksFor(offering.course_code, todayTasks);
  const next = nextClassLabel(offering.days, offering.times);

  const key = courseKey(offering.course_code, offering.section);
  const [pref, setPref] = useCoursePref(key);
  const accent = courseAccentStyles(key);
  const pinned = !!pref.pinned;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className={cn(
        "group relative rounded-[1.25rem] border-2 bg-white p-5 transition-shadow flex flex-col h-full",
        accent.border,
        accent.shadow,
        "hover:shadow-[0_16px_36px_-20px_rgba(0,0,0,0.12)]"
      )}
    >
      {isFaculty ? (
        <Link
          to="/courses/$courseCode/section"
          params={{ courseCode: encodeCourseCode(offering.course_code) }}
          search={{ section: offering.section }}
          aria-label={`Open ${offering.course_code} Section ${offering.section} Hub`}
          className="absolute inset-0 z-10 rounded-[1.25rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7d9b76]"
        />
      ) : (
        <Link
          to="/courses/$courseCode"
          params={{ courseCode: encodeCourseCode(offering.course_code) }}
          aria-label={`Open ${offering.course_code} ${offering.title}`}
          className="absolute inset-0 z-10 rounded-[1.25rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7d9b76]"
        />
      )}

      <div className="relative z-20 flex-1 flex flex-col justify-between pointer-events-none">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("font-mono text-xs font-bold tracking-tight", accent.text)}>
              {offering.course_code}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-900 text-white uppercase tracking-wider">
              Sec {offering.section}
            </span>
            <span className="text-[9px] text-[#7d9b76] font-semibold uppercase tracking-wider">
              {offering.credit} cr
            </span>
            {pinned && <Pin className="w-3 h-3 text-[#7d9b76]" fill="currentColor" />}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Card actions"
                  className="ml-auto relative z-30 grid place-items-center w-7 h-7 rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition pointer-events-auto"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link
                    to="/courses/$courseCode/section"
                    params={{ courseCode: encodeCourseCode(offering.course_code) }}
                    search={{ section: offering.section }}
                    className="flex items-center w-full"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Go to Section Hub
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPref({ pinned: !pinned })}>
                  <Pin className="w-4 h-4 mr-2" />
                  {pinned ? "Unpin" : "Pin to top"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <h3 className="mt-2 font-display text-xl tracking-tight font-semibold leading-tight text-slate-800 group-hover:text-[#7d9b76] transition-colors">
            {offering.title}
          </h3>

          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#a8c0a0]/15 text-[#7d9b76] text-[9px] font-bold">
              {offering.faculty_initial}
            </span>
            <span className="font-medium text-slate-600 truncate">{offering.faculty_name}</span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-[11px]">
            {offering.days.map((day, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-[#faf8f3] border border-[#dce5d4]/40 text-[#7d9b76] text-[9px] font-bold uppercase tracking-wider">
                    {day}
                  </span>
                  <span>{offering.times[i]}</span>
                </span>
                <span className="text-slate-400 flex items-center gap-1 font-mono">
                  <MapPin className="w-3 h-3 text-slate-300" />
                  {offering.rooms[i] ?? offering.rooms[0]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="truncate italic">Next: {next}</span>
          <div className="flex items-center gap-2 relative z-30 pointer-events-auto">
            <Link
              to="/courses/$courseCode/section"
              params={{ courseCode: encodeCourseCode(offering.course_code) }}
              search={{ section: offering.section }}
              className="inline-flex items-center px-2 py-0.5 rounded-full border border-[#dce5d4] hover:bg-[#7d9b76] hover:text-white transition bg-[#faf8f3] font-semibold text-[#7d9b76]"
            >
              Go to Section
            </Link>
            <span className="font-semibold text-[#7d9b76] shrink-0 bg-[#faf8f3] border border-[#dce5d4]/60 px-2 py-0.5 rounded-full">
              {pending.length} task{pending.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
