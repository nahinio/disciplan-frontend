import { useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { type CalEvent, type CalEventType } from "@/lib/dashboard-data";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useRoutine } from "@/hooks/useRoutine";
import { useUserStats } from "@/hooks/useUserStats";
import { routineEventsForDate } from "@/lib/routineUtils";
import { EventDialog } from "./EventDialog";
import { DayEventsDialog } from "./DayEventsDialog";
import { RoutineScheduleDialog } from "./RoutineScheduleDialog";

const dotColor: Record<string, string> = {
  personal: "bg-sky-500",
  team: "bg-emerald-500",
  deadline: "bg-rose",
  lecture: "bg-indigo-500",
  "office-hours": "bg-emerald-500",
  grading: "bg-amber-500",
  "exam-quiz": "bg-rose-500",
  meeting: "bg-purple-500",
  class: "bg-violet-500",
};

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const monthFmt = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });

export function AcademicCalendar() {
  const { profile } = useUserStats();
  const isFaculty = profile.role === "faculty";
  const { events: apiEvents } = useCalendarEvents();
  const { slots: routineSlots } = useRoutine();
  const [cursor, setCursor] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [dialogDate, setDialogDate] = useState<Date | null>(null);
  const [dayDate, setDayDate] = useState<Date | null>(null);
  const [routineOpen, setRoutineOpen] = useState(false);

  const events = useMemo(() => {
    const taskTypeMap: Record<string, CalEventType> = {
      lecture: "lecture",
      grading: "grading",
      exam_quiz: "exam-quiz",
      meeting: "meeting",
      personal: "personal",
      ct: "deadline",
      assignment: "deadline",
      presentation: "deadline",
      personal_goal: "personal",
    };

    return apiEvents.map((e): CalEvent => {
      let type: CalEventType = e.course_code ? "deadline" : "personal";
      if (e.item_type === "task") {
        type = taskTypeMap[e.planner_task_type_code ?? ""] ?? "deadline";
      }
      const title =
        e.item_type === "task" && e.completion_percent != null && e.completion_percent > 0
          ? `${e.title} (${e.completion_percent}%)`
          : e.title;
      const itemType = e.item_type ?? "event";
      return {
        id: `${itemType}-${e.id}`,
        title,
        date: new Date(e.starts_at),
        type,
        eventPlanId: e.event_plan_id ?? null,
        calendarEventId: itemType === "event" ? e.id : null,
        taskId: itemType === "task" ? e.id : null,
      };
    });
  }, [apiEvents]);

  const grid = useMemo(() => {
    const first = new Date(cursor);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: { date: Date; inMonth: boolean }[] = [];

    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(cursor);
      d.setDate(-i);
      cells.push({ date: d, inMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), i), inMonth: true });
    }
    while (cells.length % 7 !== 0 || cells.length < 42) {
      const last = cells[cells.length - 1].date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      cells.push({ date: d, inMonth: d.getMonth() === cursor.getMonth() });
      if (cells.length >= 42) break;
    }
    return cells;
  }, [cursor]);

  const today = new Date();
  const dayEvents = (date: Date) => {
    const regular = events.filter((e) => sameDay(e.date, date));
    const routine = routineEventsForDate(routineSlots, date);
    return [...routine, ...regular].sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const move = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 gap-4">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-800">Academic Calendar</h2>
          <p className="text-sm text-muted-foreground mt-1">{monthFmt.format(cursor)}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {(isFaculty || profile.role === "student") && (
            <button
              type="button"
              onClick={() => setRoutineOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card hover:bg-muted text-xs font-bold text-slate-700 transition shadow-sm cursor-pointer"
            >
              <CalendarRange className="w-3.5 h-3.5 text-rose-600" />
              {isFaculty ? "View Teaching Schedule" : "View Routine"}
            </button>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => move(-1)}
              className="grid place-items-center w-9 h-9 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="px-3 h-9 rounded-full text-sm font-medium hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              Today
            </button>
            <button
              onClick={() => move(1)}
              className="grid place-items-center w-9 h-9 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {grid.map(({ date, inMonth }, i) => {
            const evs = dayEvents(date);
            const isToday = sameDay(date, today);
            const visible = evs.slice(0, 3);
            const hidden = evs.length - visible.length;
            return (
              <div
                key={i}
                onClick={() => setDayDate(date)}
                className={`group relative min-h-28 border-b border-r border-border p-2 transition hover:bg-muted/30 cursor-pointer ${
                  inMonth ? "" : "bg-muted/20 text-muted-foreground/50"
                } ${(i + 1) % 7 === 0 ? "border-r-0" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDialogDate(date);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition grid place-items-center w-5 h-5 rounded-full hover:bg-foreground hover:text-background text-muted-foreground"
                    aria-label="Add event"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <span
                    className={`text-xs font-medium tabular-nums ${
                      isToday
                        ? "w-6 h-6 grid place-items-center rounded-full bg-rose text-white font-semibold animate-pulse"
                        : ""
                    }`}
                  >
                    {date.getDate()}
                  </span>
                </div>

                <div className="mt-1 space-y-1">
                  {visible.map((e) => (
                    <div
                      key={e.id}
                      title={e.title}
                      className="flex items-center gap-1.5 text-[11px] leading-tight px-1.5 py-1 rounded-md bg-muted/65 hover:bg-muted transition"
                    >
                      <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${dotColor[e.type] || "bg-slate-400"}`} />
                      <span className="truncate font-semibold text-slate-700">{e.title}</span>
                    </div>
                  ))}
                  {hidden > 0 && (
                    <div className="text-[10px] text-muted-foreground px-1.5 font-bold">
                      +{hidden} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        {profile.role === "faculty" ? (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500" /> Class
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" /> Lecture
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Office Hours
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Grading
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Exam/Quiz
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" /> Meeting
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500" /> Personal Goals
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500" /> Class
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500" /> Personal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Team
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose" /> Deadline
            </span>
          </>
        )}
      </div>

      <DayEventsDialog
        open={dayDate !== null}
        date={dayDate}
        events={dayDate ? dayEvents(dayDate) : []}
        onClose={() => setDayDate(null)}
        onAddEvent={() => {
          const d = dayDate;
          setDayDate(null);
          setDialogDate(d);
        }}
      />

      <EventDialog
        open={dialogDate !== null}
        onClose={() => setDialogDate(null)}
        initialDate={dialogDate}
      />

      <RoutineScheduleDialog
        open={routineOpen}
        onClose={() => setRoutineOpen(false)}
        slots={routineSlots}
        isFaculty={isFaculty}
      />
    </section>
  );
}
