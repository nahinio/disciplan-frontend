import { createFileRoute } from "@tanstack/react-router";
import { appRouteSsr, requireAuth } from "@/lib/routeAuth";
import { useState } from "react";
import { Search, LayoutGrid, List, X } from "lucide-react";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { CourseCard } from "@/components/courses/CourseCard";
import { CourseListRow } from "@/components/courses/CourseListRow";
import { courseKey, useAllCoursePrefs } from "@/lib/coursePrefs";
import { cn } from "@/lib/utils";
import { useUserStats } from "@/hooks/useUserStats";
import { useOfferings } from "@/hooks/useOfferings";
import { RequestSectionDialog } from "@/components/courses/RequestSectionDialog";
import { RefreshButton } from "@/components/ui/refresh-button";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEnrollmentData } from "@/lib/invalidateAppData";

export const Route = createFileRoute("/courses")({
  ssr: appRouteSsr,
  beforeLoad: () => {
    requireAuth();
  },
  head: () => ({
    meta: [
      { title: "DisciPlan — Courses" },
      {
        name: "description",
        content:
          "All the courses you're enrolled in this trimester, with pending tasks, schedule, and faculty.",
      },
      { property: "og:title", content: "DisciPlan — Courses" },
      {
        property: "og:description",
        content: "Your trimester course load at a glance.",
      },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const qc = useQueryClient();
  const { profile } = useUserStats();
  const { offerings: currentOfferings, loading, refresh: refreshOfferings } = useOfferings();
  const { refresh: refreshCourses, isRefreshing } = usePageRefresh(async () => {
    await invalidateEnrollmentData(qc);
    await refreshOfferings();
  });
  const prefs = useAllCoursePrefs();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState<"All" | "Sun" | "Mon" | "Tue" | "Wed" | "Thu">("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const sorted = [...currentOfferings].sort((a, b) => {
    const ap = prefs[courseKey(a.course_code, a.section)]?.pinned ? 1 : 0;
    const bp = prefs[courseKey(b.course_code, b.section)]?.pinned ? 1 : 0;
    return bp - ap;
  });

  const filtered = sorted.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      c.course_code.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      (c.faculty_name || "").toLowerCase().includes(q);

    const matchesDay = selectedDay === "All" || c.days.includes(selectedDay);

    return matchesSearch && matchesDay;
  });

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-foreground">
      <TopHeader />
      <div className="flex-1 flex min-h-0">
        <main className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {loading
                  ? "Loading courses…"
                  : `${profile.role === "faculty" ? `${currentOfferings.length} classes teaching` : `${currentOfferings.length} enrolled`}`}
              </p>
              <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mt-2 text-slate-800">
                {profile.role === "faculty" ? "Teaching sections" : "Trimester courses"}
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl">
                {profile.role === "faculty"
                  ? "All course sections you are currently teaching, with quick access to each section hub, tasks, schedules, and grading."
                  : "Every course you're registered for, with the next class and what's still on your plate."
                }
              </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <RefreshButton onClick={refreshCourses} loading={isRefreshing} />
                {profile.role === "student" && <RequestSectionDialog />}
              </div>
            </header>

            {/* Controls Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-4 border-y border-[#dce5d4]/40">
              {/* Search Bar */}
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search code, title, faculty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-9 rounded-full border border-[#dce5d4] bg-white text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-[#7d9b76] focus:ring-1 focus:ring-[#7d9b76] transition shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Day Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {(["All", "Sun", "Mon", "Tue", "Wed", "Thu"] as const).map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "px-3.5 h-8 rounded-full text-[10px] font-bold uppercase tracking-wider transition border cursor-pointer",
                      selectedDay === day
                        ? "bg-[#7d9b76] text-white border-[#7d9b76] shadow-sm"
                        : "bg-white text-slate-500 border-[#dce5d4] hover:border-slate-400"
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 shrink-0 bg-[#faf8f3] border border-[#dce5d4] p-0.5 rounded-full self-end sm:self-auto shadow-sm">
                <button
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid View"
                  className={cn(
                    "grid place-items-center w-8 h-8 rounded-full transition cursor-pointer",
                    viewMode === "grid" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  aria-label="List View"
                  className={cn(
                    "grid place-items-center w-8 h-8 rounded-full transition cursor-pointer",
                    viewMode === "list" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Courses Display */}
            {filtered.length === 0 ? (
              <div className="py-16 text-center rounded-[1.25rem] border border-dashed border-[#dce5d4] bg-white shadow-sm">
                <p className="text-sm text-slate-500 font-medium">
                  {currentOfferings.length === 0 && profile.role === "student"
                    ? "You are not enrolled in any sections yet."
                    : "No courses match your filter criteria."}
                </p>
                {currentOfferings.length === 0 && profile.role === "student" ? (
                  <p className="mt-2 text-xs text-slate-400">
                    Use <strong>Request a section</strong> above, or wait for an admin to assign you.
                  </p>
                ) : (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedDay("All");
                    }}
                    className="mt-3 text-xs font-bold text-[#7d9b76] hover:text-[#6b8865] underline transition-colors cursor-pointer"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((c) => (
                  <CourseCard key={`${c.course_code}-${c.section}`} offering={c} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((c) => (
                  <CourseListRow key={`${c.course_code}-${c.section}`} offering={c} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
