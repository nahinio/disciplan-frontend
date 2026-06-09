import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { MapPin, MoreHorizontal, Pin, MessageSquare } from "lucide-react";
import type { CourseOffering } from "@/types/course";
import { pendingTasksFor } from "@/lib/courseTasks";
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

export function CourseListRow({ offering }: { offering: CourseOffering }) {
  const { profile } = useUserStats();
  const { todayTasks } = useTasks();
  const isFaculty = profile.role === "faculty";
  const pending = pendingTasksFor(offering.course_code, todayTasks);
  const key = courseKey(offering.course_code, offering.section);
  const [pref, setPref] = useCoursePref(key);
  const accent = courseAccentStyles(key);
  const pinned = !!pref.pinned;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "group relative flex flex-col md:flex-row md:items-center gap-4 rounded-xl border-2 bg-white p-4 transition-colors shadow-sm",
        accent.border
      )}
    >
      <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-3 md:gap-5">
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("font-mono text-xs font-bold tracking-tight", accent.text)}>
            {offering.course_code}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-900 text-white uppercase tracking-wider">
            Sec {offering.section}
          </span>
        </div>

        <div className="min-w-0 flex-1 relative">
          {isFaculty ? (
            <Link
              to="/courses/$courseCode/section"
              params={{ courseCode: encodeCourseCode(offering.course_code) }}
              search={{ section: offering.section }}
              className="font-display text-base font-semibold text-slate-800 hover:text-[#7d9b76] focus:outline-none transition-colors truncate block"
            >
              {offering.title}
            </Link>
          ) : (
            <Link
              to="/courses/$courseCode"
              params={{ courseCode: encodeCourseCode(offering.course_code) }}
              className="font-display text-base font-semibold text-slate-800 hover:text-[#7d9b76] focus:outline-none transition-colors truncate block"
            >
              {offering.title}
            </Link>
          )}
          <p className="text-[11px] text-slate-500 mt-0.5 md:hidden">
            Faculty: {offering.faculty_name}
          </p>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 shrink-0 w-44">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#a8c0a0]/15 text-[#7d9b76] text-[9px] font-bold">
            {offering.faculty_initial}
          </span>
          <span className="truncate">{offering.faculty_name}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 shrink-0 lg:w-72">
          {offering.days.map((day, i) => (
            <div key={i} className="flex items-center gap-1.5 font-medium">
              <span className="inline-block px-1 rounded bg-[#faf8f3] border border-[#dce5d4]/40 text-[#7d9b76] text-[9px] font-black uppercase tracking-wider">
                {day}
              </span>
              <span className="text-[11px] font-semibold text-slate-600">{offering.times[i]}</span>
              <span className="text-slate-400 font-mono text-[10px] flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5" />
                {offering.rooms[i] ?? offering.rooms[0]}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0 md:ml-auto relative z-30 pointer-events-auto">
          <Link
            to="/courses/$courseCode/section"
            params={{ courseCode: encodeCourseCode(offering.course_code) }}
            search={{ section: offering.section }}
            className="inline-flex items-center px-2 py-0.5 rounded-full border border-[#dce5d4] hover:bg-[#7d9b76] hover:text-white transition bg-[#faf8f3] font-semibold text-[#7d9b76] text-[10px]"
          >
            Section Hub
          </Link>
          {pinned && <Pin className="w-3.5 h-3.5 text-[#7d9b76]" fill="currentColor" />}
          <span className="font-semibold text-xs text-[#7d9b76] bg-[#faf8f3] border border-[#dce5d4]/60 px-2.5 py-0.5 rounded-full shrink-0">
            {pending.length} task{pending.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="relative z-30 shrink-0 self-end md:self-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Actions"
              className="grid place-items-center w-8 h-8 rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition"
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
    </motion.div>
  );
}
