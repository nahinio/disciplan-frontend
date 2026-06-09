import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, CalendarDays } from "lucide-react";
import type { CalEvent, CalEventType } from "@/lib/dashboard-data";
import { EventPlanMenu } from "./EventPlanMenu";

const dotColor: Record<CalEventType, string> = {
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

const typeLabel: Record<CalEventType, string> = {
  personal: "Personal",
  team: "Team",
  deadline: "Deadline",
  lecture: "Lecture",
  "office-hours": "Office Hours",
  grading: "Grading",
  "exam-quiz": "Exam/Quiz",
  meeting: "Meeting",
  class: "Class",
};

const dateFmt = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function DayEventsDialog({
  open,
  date,
  events,
  onClose,
  onAddEvent,
}: {
  open: boolean;
  date: Date | null;
  events: CalEvent[];
  onClose: () => void;
  onAddEvent: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && date && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md max-h-[85vh] overflow-y-auto no-scrollbar rounded-2xl bg-card shadow-2xl border border-border"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 grid place-items-center w-8 h-8 rounded-full hover:bg-muted text-muted-foreground z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-7">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                Day Schedule
              </p>
              <h3 className="font-display text-2xl font-semibold tracking-tight">
                {dateFmt.format(date)}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {events.length === 0
                  ? "No events scheduled"
                  : `${events.length} event${events.length === 1 ? "" : "s"}`}
              </p>

              <div className="mt-6 space-y-2">
                {events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted grid place-items-center mb-3">
                      <CalendarDays className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Nothing on the books for this day.
                    </p>
                  </div>
                ) : (
                  events.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl border border-border bg-background hover:border-foreground/20 transition"
                    >
                      <span className={`shrink-0 w-2 h-2 rounded-full ${dotColor[e.type]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{e.title}</p>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mt-0.5">
                          {typeLabel[e.type]}
                        </p>
                      </div>
                      <EventPlanMenu
                        eventRef={{
                          eventPlanId: e.eventPlanId,
                          calendarEventId: e.calendarEventId,
                          taskId: e.taskId,
                          isRoutine: e.isRoutine,
                        }}
                      />
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={onAddEvent}
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
