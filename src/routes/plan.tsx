import { createFileRoute, Link } from "@tanstack/react-router";
import { appRouteSsr, requireAuth } from "@/lib/routeAuth";
import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { useTasks, UserTask, taskDifficulty } from "@/hooks/useTasks";
import { useUserStats } from "@/hooks/useUserStats";
import { RefreshButton } from "@/components/ui/refresh-button";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { invalidatePlannerData } from "@/lib/invalidateAppData";
import {
  CalendarDays,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plan")({
  ssr: appRouteSsr,
  beforeLoad: () => {
    requireAuth();
  },
  head: () => ({
    meta: [
      { title: "DisciPlan — 10-Day Plan" },
      {
        name: "description",
        content: "View and customize your AI-planned academic task schedule for the next 10 days.",
      },
    ],
  }),
  component: TaskPlanPage,
});

function TaskPlanPage() {
  const qc = useQueryClient();
  const { profile, loading: profileLoading, refreshProfile } = useUserStats();
  const { planTasks, planLoading, refresh, updateTask } = useTasks();

  const { refresh: refreshPlanPage, isRefreshing } = usePageRefresh(async () => {
    await invalidatePlannerData(qc);
    await refreshProfile();
    await refresh();
  });

  // Generate date list for the next 10 days starting from today
  const dayList = useMemo(() => {
    const start = new Date();
    // Reset start time to local midnight for consistent dates
    start.setHours(0, 0, 0, 0);

    return Array.from({ length: 10 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const isoStr = d.toLocaleDateString("sv-SE"); // sv-SE format matches YYYY-MM-DD
      
      const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
      const monthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      
      let label = weekday;
      if (i === 0) label = "Today";
      else if (i === 1) label = "Tomorrow";

      return {
        isoStr,
        weekday,
        monthDay,
        label,
        d,
      };
    });
  }, []);

  // Map YYYY-MM-DD strings for options list (no unscheduled option)
  const rescheduleOptions = useMemo(() => {
    return dayList.map((day) => ({
      value: day.isoStr,
      label: `${day.label} (${day.monthDay})`,
    }));
  }, [dayList]);

  // Group tasks by their resolved effective_date (only scheduled days, no backlog column)
  const groupedTasks = useMemo(() => {
    const groups: Record<string, UserTask[]> = {};
    dayList.forEach((day) => {
      groups[day.isoStr] = [];
    });

    planTasks.forEach((task) => {
      const effDate = task.effective_date;
      if (effDate && groups[effDate]) {
        groups[effDate].push(task);
      }
    });

    return groups;
  }, [planTasks, dayList]);

  const handleSaveTask = async (id: number, completed: boolean, dateStr: string | null) => {
    const task = planTasks.find((t) => t.id === id);
    if (!task) return;

    const body: Record<string, any> = {
      scheduled_for_date: dateStr,
    };

    if (completed !== task.is_completed) {
      body.completed = completed;
      if (task.source === "event_slice") {
        const eff = Number(task.effective_target_percent ?? 100);
        body.completed_portion_percent = completed ? eff : 0;
      } else {
        body.completion_percent = completed ? 100 : 0;
      }
    }

    await updateTask(id, body);
  };

  if (planLoading || profileLoading) {
    return (
      <div className="h-screen flex flex-col bg-paper text-ink">
        <TopHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-6 h-6 animate-spin border-2 border-rose border-t-transparent rounded-full" />
          <p className="text-xs text-muted-foreground font-semibold">Loading plan schedule…</p>
        </div>
        <MobileTabBar />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-paper text-ink">
      <TopHeader />
      
      <div className="flex-1 flex flex-col min-h-0 bg-[#faf8f5]/60 dark:bg-slate-950/20">
        {/* Subheader */}
        <header className="px-6 md:px-8 py-5 border-b border-border/80 bg-white/70 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-rose hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Dashboard
              </Link>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-slate-800">
              10-Day Task Schedule
            </h1>
            <p className="text-muted-foreground text-xs font-medium">
              Rearrange, prioritize, and adjust your AI task flow across the upcoming days.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <RefreshButton onClick={refreshPlanPage} loading={isRefreshing} className="shrink-0" />
          </div>
        </header>

        {/* Scrollable Columns Container */}
        <main className="flex-1 overflow-x-auto overflow-y-hidden flex gap-6 px-6 md:px-8 py-6 no-scrollbar">
          {dayList.map((day) => {
            const tasks = groupedTasks[day.isoStr] || [];
            const completedCount = tasks.filter((t) => t.is_completed).length;
            const incompleteCount = tasks.length - completedCount;

            return (
              <div
                key={day.isoStr}
                className={cn(
                  "w-80 shrink-0 flex flex-col bg-white dark:bg-card border rounded-2xl shadow-sm max-h-full transition",
                  day.label === "Today"
                    ? "border-rose-200 ring-1 ring-rose-100/50"
                    : "border-border/80"
                )}
              >
                {/* Column Header */}
                <div className="p-4 border-b border-border/60 rounded-t-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center",
                        day.label === "Today"
                          ? "bg-rose-50 text-rose"
                          : "bg-slate-50 text-slate-500"
                      )}
                    >
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">
                        {day.label === "Today" || day.label === "Tomorrow"
                          ? `${day.label}, ${day.monthDay}`
                          : `${day.weekday}, ${day.monthDay}`}
                      </h3>
                      <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
                        <span>
                          {tasks.length} task{tasks.length === 1 ? "" : "s"}
                        </span>
                      </p>
                    </div>
                  </div>
                  {incompleteCount > 0 && (
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        day.label === "Today"
                          ? "bg-rose-50 text-rose-600 border border-rose-100/30"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {incompleteCount} left
                    </span>
                  )}
                </div>

                {/* Column Body */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
                  {tasks.length === 0 ? (
                    <div className="py-12 text-center space-y-2">
                      <Sparkles className="w-7 h-7 text-rose/30 mx-auto" />
                      <p className="text-[10px] text-muted-foreground font-semibold">
                        Clear schedule for this day!
                      </p>
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        rescheduleOptions={rescheduleOptions}
                        onSave={handleSaveTask}
                        onUpdateTask={updateTask}
                        isStudent={profile?.role === "student"}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </main>
      </div>

      <MobileTabBar />
    </div>
  );
}

// Single task block widget inside day cards
interface TaskCardProps {
  task: UserTask;
  rescheduleOptions: { value: string; label: string }[];
  onSave: (id: number, completed: boolean, dateStr: string | null) => Promise<void>;
  onUpdateTask?: (id: number, body: Record<string, any>) => Promise<void>;
  isStudent: boolean;
}

function TaskCard({
  task,
  rescheduleOptions,
  onSave,
  onUpdateTask,
  isStudent,
}: TaskCardProps) {
  const [localCompleted, setLocalCompleted] = useState(task.is_completed);
  const [localDate, setLocalDate] = useState(task.scheduled_for_date || task.effective_date || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);

  useEffect(() => {
    setLocalCompleted(task.is_completed);
    setLocalDate(task.scheduled_for_date || task.effective_date || "");
  }, [task.is_completed, task.scheduled_for_date, task.effective_date]);

  const isDone = localCompleted;
  const diff = taskDifficulty(task.priority_code);

  const diffBadgeColor: Record<string, string> = {
    Hard: "bg-rose-50 text-rose-700 border-rose-100/60 dark:bg-rose-950/20",
    Medium: "bg-slate-50 text-slate-600 border-slate-200/50 dark:bg-slate-900/10",
    Easy: "bg-emerald-50 text-emerald-700 border-emerald-100/60 dark:bg-emerald-950/20",
  };

  const hasChanges =
    localCompleted !== task.is_completed ||
    localDate !== (task.scheduled_for_date || task.effective_date || "");

  return (
    <div
      className={cn(
        "p-3.5 rounded-xl border bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-3 group/card transition",
        isDone
          ? "border-emerald-100 bg-emerald-50/20 dark:border-emerald-900/10"
          : "border-border/60 hover:border-slate-300 dark:hover:border-slate-800"
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Completion Checkbox */}
        <button
          type="button"
          disabled={task.source === "grading_linked"}
          onClick={() => setLocalCompleted(!localCompleted)}
          className={cn(
            "mt-0.5 rounded-full shrink-0 outline-none transition cursor-pointer",
            isDone ? "text-emerald-500 hover:text-emerald-600" : "text-muted-foreground/40 hover:text-rose",
            task.source === "grading_linked" && "opacity-50 cursor-not-allowed hover:text-muted-foreground/40"
          )}
        >
          {isDone ? (
            <CheckCircle2 className="w-4.5 h-4.5" />
          ) : (
            <Circle className="w-4.5 h-4.5" />
          )}
        </button>

        {/* Task Details */}
        <div className="flex-1 min-w-0 space-y-1">
          <p
            className={cn(
              "text-xs font-semibold tracking-tight leading-normal",
              isDone ? "text-slate-500/80 line-through" : "text-slate-800"
            )}
          >
            {task.title}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {task.course_code && (
              <span className="text-[9px] font-mono font-bold text-rose bg-rose-50 dark:bg-rose-950/10 px-1.5 py-0.5 rounded">
                {task.course_code}
              </span>
            )}
            <span
              className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider",
                diffBadgeColor[diff]
              )}
            >
              {diff}
            </span>
          </div>
        </div>
      </div>

      {/* Rescheduling select dropdown */}
      <div className="border-t border-border/40 pt-2 flex flex-col gap-1.5">
        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
          Schedule Day
        </label>
        <select
          value={localDate}
          onChange={(e) => setLocalDate(e.target.value)}
          className="w-full h-8 px-2 rounded-lg border border-border/80 bg-background text-[10px] font-semibold text-slate-700 focus:outline-none focus:border-rose focus:ring-1 focus:ring-rose transition cursor-pointer"
        >
          {rescheduleOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Deadline option for grading task */}
      {!isStudent && task.source === "grading_linked" && (
        <div className="border-t border-border/40 pt-2 flex flex-col gap-1.5">
          {isEditingDeadline ? (
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                {task.due_at ? "Change grading deadline" : "Add grading deadline"}
              </span>
              <div className="flex gap-2 items-center">
                <input
                  type="datetime-local"
                  defaultValue={task.due_at ? task.due_at.slice(0, 16) : ""}
                  className="w-full h-8 px-2 rounded-lg border border-rose-250 bg-white text-[10px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-colors"
                  id={`plan-deadline-input-${task.id}`}
                />
                <button
                  type="button"
                  onClick={async () => {
                    const input = document.getElementById(`plan-deadline-input-${task.id}`) as HTMLInputElement;
                    if (input && input.value) {
                      const dueAtIso = new Date(input.value).toISOString();
                      if (onUpdateTask) {
                        await onUpdateTask(task.id, { due_at: dueAtIso });
                      }
                      setIsEditingDeadline(false);
                    }
                  }}
                  className="px-3 h-8 rounded-lg bg-rose text-white text-[9px] font-bold shadow-sm hover:bg-rose/90 transition-colors cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingDeadline(false)}
                  className="px-2 h-8 rounded-lg border border-slate-200 text-slate-500 text-[9px] font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : task.due_at ? (
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                Deadline
              </span>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-700">
                  {new Date(task.due_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingDeadline(true)}
                  className="text-[9px] font-bold text-rose hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingDeadline(true)}
              className="w-full py-1.5 rounded-lg border border-rose-200 bg-rose-50/30 hover:bg-rose-50 text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 text-[10px] font-bold transition-colors cursor-pointer"
            >
              Prompt: Add Deadline
            </button>
          )}
        </div>
      )}

      {/* Save changes button */}
      {hasChanges && (
        <div className="border-t border-border/40 pt-2 flex justify-end">
          <button
            type="button"
            disabled={isSaving}
            onClick={async () => {
              setIsSaving(true);
              try {
                await onSave(task.id, localCompleted, localDate || null);
              } catch (err) {
                console.error(err);
              } finally {
                setIsSaving(false);
              }
            }}
            className="w-full px-3 py-1.5 bg-rose hover:bg-rose/90 text-white font-bold text-[10px] rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
          >
            {isSaving ? (
              <span className="w-3 h-3 animate-spin border-2 border-white border-t-transparent rounded-full" />
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

