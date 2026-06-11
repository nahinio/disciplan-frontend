import { Calendar, CheckCircle2, Clock3 } from "lucide-react";
import { countdown } from "@/lib/dashboard-data";
import { useTasks, formatDue, taskDifficulty } from "@/hooks/useTasks";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { cn } from "@/lib/utils";

const priorityTone: Record<string, string> = {
  High: "bg-rose-100 text-rose-700",
  Med: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
};

function normCode(code: string) {
  return code.toUpperCase().replace(/\s+/g, "");
}

export function CourseTasksPanel({ code }: { code: string }) {
  const { tasks: allTasks, todayTasks } = useTasks();
  const { events: calendarEvents } = useCalendarEvents(false);
  const target = normCode(code);

  const todayTaskIds = new Set(todayTasks.map((t) => t.id));

  const courseTasks = allTasks.filter(
    (t) => !t.is_completed && t.course_code && normCode(t.course_code) === target
  );

  const pendingTasks = courseTasks
    .filter((t) => todayTaskIds.has(t.id))
    .map((t) => ({
      id: String(t.id),
      title: t.title,
      priority:
        taskDifficulty(t.priority_code) === "Hard"
          ? "High"
          : taskDifficulty(t.priority_code) === "Easy"
            ? "Low"
            : "Med",
      dueLabel: t.due_at ? countdown(new Date(t.due_at)) : formatDue(t.due_at) ?? "—",
    }));

  const upcomingTasks = courseTasks
    .filter((t) => !todayTaskIds.has(t.id))
    .map((t) => ({
      id: String(t.id),
      title: t.title,
      priority:
        taskDifficulty(t.priority_code) === "Hard"
          ? "High"
          : taskDifficulty(t.priority_code) === "Easy"
            ? "Low"
            : "Med",
      dueLabel: t.due_at ? countdown(new Date(t.due_at)) : formatDue(t.due_at) ?? "—",
    }));

  const events = calendarEvents
    .filter((e) => e.course_code && normCode(e.course_code) === target)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 4);

  return (
    <section className="rounded-[1.5rem] border border-[#dce5d4] bg-white p-6 shadow-[0_8px_24px_-16px_rgba(125,155,118,0.35)]">
      <header className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-2xl tracking-tight text-slate-800">Pending</h2>
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#7d9b76] font-bold">
          {pendingTasks.length} task{pendingTasks.length === 1 ? "" : "s"}
        </span>
      </header>

      {pendingTasks.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
          <CheckCircle2 className="w-4 h-4 text-[#7d9b76]" />
          Nothing due today. Breathe.
        </div>
      ) : (
        <ul className="space-y-2">
          {pendingTasks.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-xl border border-[#dce5d4] bg-[#faf8f3] px-3 py-2.5"
            >
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                  priorityTone[t.priority]
                )}
              >
                {t.priority}
              </span>
              <span className="text-sm font-medium text-slate-800 truncate flex-1">{t.title}</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 tabular-nums">
                <Clock3 className="w-3 h-3 text-[#7d9b76]" />
                {t.dueLabel}
              </span>
            </li>
          ))}
        </ul>
      )}

      {upcomingTasks.length > 0 && (
        <>
          <div className="mt-6 mb-3 flex items-baseline justify-between">
            <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#7d9b76] font-bold">
              Upcoming tasks
            </h3>
            <span className="text-[9px] uppercase tracking-[0.15em] text-[#7d9b76] font-semibold">
              {upcomingTasks.length} upcoming
            </span>
          </div>
          <ul className="space-y-2">
            {upcomingTasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-xl border border-[#dce5d4] bg-[#faf8f3] px-3 py-2.5"
              >
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                    priorityTone[t.priority]
                  )}
                >
                  {t.priority}
                </span>
                <span className="text-sm font-medium text-slate-800 truncate flex-1">{t.title}</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 tabular-nums">
                  <Clock3 className="w-3 h-3 text-[#7d9b76]" />
                  {t.dueLabel}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {events.length > 0 && (
        <>
          <div className="mt-6 mb-3 flex items-baseline justify-between">
            <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#7d9b76] font-bold">
              Upcoming events
            </h3>
          </div>
          <ul className="space-y-1.5">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 text-sm text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-[#7d9b76]" />
                <span className="flex-1 truncate">{e.title}</span>
                <span className="text-[11px] text-slate-500 tabular-nums">
                  {new Date(e.starts_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
