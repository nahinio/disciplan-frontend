import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarDays, Clock, MapPin, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  groupRoutineByDay,
  formatRoutineTimeRange,
  type RoutineSlot,
} from "@/lib/routineUtils";

export function RoutineScheduleDialog({
  open,
  onClose,
  slots,
  isFaculty,
}: {
  open: boolean;
  onClose: () => void;
  slots: RoutineSlot[];
  isFaculty: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const todayIdx = new Date().getDay();
  const byDay = groupRoutineByDay(slots);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-foreground/30 backdrop-blur-sm p-4 sm:p-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl my-auto max-h-[min(90vh,calc(100vh-2rem))] overflow-hidden rounded-2xl bg-card shadow-2xl border border-border flex flex-col"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 grid place-items-center w-8 h-8 rounded-full hover:bg-muted text-muted-foreground cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pt-6 pb-4 border-b border-border bg-muted/20">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">
                {isFaculty ? "Faculty" : "Student"}
              </p>
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-slate-800 mt-1">
                {isFaculty ? "Teaching schedule" : "Weekly routine"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isFaculty
                  ? "Your assigned sections by day and time."
                  : "Your enrolled classes across the week."}
              </p>
            </div>

            <div className="overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-4">
              {slots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted grid place-items-center mb-4">
                    <CalendarDays className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {isFaculty ? "No teaching sections yet." : "No classes on your routine yet."}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    {isFaculty
                      ? "Sections appear here once you are assigned to teach."
                      : "Enroll in sections and your weekly schedule will show up here and on the calendar."}
                  </p>
                </div>
              ) : (
                byDay.map((day, idx) => {
                  const isToday = idx === todayIdx;
                  return (
                    <section
                      key={day.code}
                      className={cn(
                        "rounded-xl border overflow-hidden",
                        isToday ? "border-rose-200/70 ring-1 ring-rose-100" : "border-border"
                      )}
                    >
                      <div
                        className={cn(
                          "px-4 py-2.5 flex items-center justify-between",
                          isToday ? "bg-rose-50/80" : "bg-muted/40"
                        )}
                      >
                        <h3
                          className={cn(
                            "text-xs font-bold uppercase tracking-[0.16em]",
                            isToday ? "text-rose-700" : "text-slate-500"
                          )}
                        >
                          {day.label}
                        </h3>
                        {isToday && (
                          <span className="text-[10px] font-bold text-rose-600 bg-white/80 px-2 py-0.5 rounded-full">
                            Today
                          </span>
                        )}
                      </div>

                      {day.items.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-muted-foreground">No classes</p>
                      ) : (
                        <ul className="divide-y divide-border">
                          {day.items.map((slot, i) => (
                            <li
                              key={`${slot.section_id}-${slot.meeting_time_id ?? i}`}
                              className="px-4 py-3.5 flex gap-3 hover:bg-muted/30 transition"
                            >
                              <div className="shrink-0 w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 grid place-items-center">
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-bold text-slate-800 font-mono">
                                    {slot.course_code}
                                  </span>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                    Sec {slot.section_label}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {slot.course_title}
                                </p>
                                <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500">
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {formatRoutineTimeRange(slot.starts_at, slot.ends_at)}
                                  </span>
                                  {slot.room && (
                                    <span className="inline-flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-slate-400" />
                                      {slot.room}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
