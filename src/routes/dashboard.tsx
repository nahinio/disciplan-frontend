import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/routeAuth";
import { useState } from "react";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import { TaskWorkspace } from "@/components/tasks/TaskWorkspace";
import { DailyEnergyBar } from "@/components/tasks/DailyEnergyBar";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { AcademicCalendar } from "@/components/dashboard/AcademicCalendar";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { useUserStats } from "@/hooks/useUserStats";
import { FacultyDashboard } from "@/components/dashboard/FacultyDashboard";
import { firstName, timeGreeting } from "@/lib/greeting";
import { useTasks } from "@/hooks/useTasks";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { PendingFacultyScreen } from "@/components/dashboard/PendingFacultyScreen";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const dashboardSearchSchema = z.object({
  view: z.string().optional(),
});

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    requireAuth();
  },
  validateSearch: (search) => dashboardSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "DisciPlan — Dashboard" },
      {
        name: "description",
        content:
          "An AI-powered Second Brain for students. Track deadlines, energy, and your critical path in one minimalist dashboard.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [leftExpanded, setLeftExpanded] = useState(false);
  const { profile, loading: profileLoading, profileReady } = useUserStats();
  const search = Route.useSearch();
  const { todayTasks, todayLoading, todayError } = useTasks();
  const openTasks = todayTasks.filter((t) => !t.is_completed).length;

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());

  if (!profileReady || (profileLoading && !profile.email)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-paper text-ink gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-rose" />
        <p className="text-xs text-muted-foreground font-medium">Loading your workspace…</p>
      </div>
    );
  }

  const isFaculty = profile.role === "faculty" && profile.status !== "pending";

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-paper text-ink">
      <TopHeader />
      <div className="flex-1 flex min-h-0">
        {!isFaculty && (
          <LeftSidebar
            expanded={leftExpanded}
            onToggle={() => setLeftExpanded((v) => !v)}
          />
        )}

        <main className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
          <div className={`mx-auto px-5 md:px-8 py-8 space-y-8 animate-in fade-in duration-300 ${
            profile.role === "admin" || isFaculty ? "max-w-7xl" : "max-w-6xl"
          }`}>
            {profile.role === "admin" ? (
              <AdminDashboard view={search.view || "overview"} />
            ) : profile.role === "faculty" && profile.status === "pending" ? (
              <PendingFacultyScreen />
            ) : profile.role === "faculty" ? (
              <FacultyDashboard />
            ) : (
              <div className="space-y-8">
                <header>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    {formattedDate}
                  </p>
                  <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mt-2 text-slate-800 leading-[1.05]">
                    {timeGreeting()}, {firstName(profile.name)}.
                  </h1>
                  <p className="text-muted-foreground mt-2 max-w-xl">
                    {todayLoading
                      ? "Loading your task queue…"
                      : todayError
                        ? "Could not load today's tasks — refresh the page or try again shortly."
                        : openTasks === 0
                        ? "No open tasks for today — schedule a calendar event or check your course sections."
                        : `You have ${openTasks} task${openTasks === 1 ? "" : "s"} on today's queue.`}
                  </p>
                </header>

                <DailyEnergyBar />

                <TaskWorkspace />

                <UpcomingEvents />

                <AcademicCalendar />
              </div>
            )}
          </div>
        </main>
      </div>
      {profile.role !== "admin" && <MobileTabBar />}
    </div>
  );
}
