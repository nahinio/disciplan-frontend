import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, Clock, CalendarDays, MapPin, GraduationCap } from "lucide-react";
import {
  useTasks,
  formatDue,
  isPlannerTask,
  isExamTask,
  displayTaskTypeLabel,
  sliceProgressPercent,
  type UserTask,
} from "@/hooks/useTasks";
import { useUserStats } from "@/hooks/useUserStats";
import { TaskProgressControl } from "./TaskProgressControl";
import { ExamStudyLinks } from "./ExamStudyLinks";
import { useRoutine } from "@/hooks/useRoutine";
import {
  formatRoutineTimeRange,
  slotsForDayIndex,
  type RoutineSlot,
} from "@/lib/routineUtils";
import { cn } from "@/lib/utils";

const priorityTone: Record<string, string> = {
  urgent: "bg-rose-100 text-rose-700 border-rose-200/60",
  high: "bg-amber-50 text-amber-700 border-amber-200/60",
  medium: "bg-slate-100 text-slate-600 border-slate-200/60",
  low: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
};

/** Open tasks first; preserve API urgency/energy order within each group. */
function openTasksFirst(tasks: UserTask[]): UserTask[] {
  const open = tasks.filter((t) => !t.is_completed);
  const done = tasks.filter((t) => t.is_completed);
  return [...open, ...done];
}

function emptyStateCopy(isSection: boolean, isFacultyDashboard: boolean): string {
  if (isSection) {
    return "No section tasks for today. Tasks are generated from event plans, deadlines, and grading.";
  }
  if (isFacultyDashboard) {
    return "No tasks for today. Create an event plan — daily slices and scheduled items appear here automatically.";
  }
  return "No tasks for today. Add an event with a deadline or weekly goal — your daily queue updates automatically.";
}

function sourceBadge(task: UserTask) {
  if (task.source === "grading_linked") {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
        Grading sync
      </span>
    );
  }
  if (task.source === "recurring_occurrence") {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium inline-flex items-center gap-1">
        <CalendarDays className="w-3 h-3" />
        Weekly
      </span>
    );
  }
  if (task.source === "one_time") {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100 font-medium">
        Scheduled
      </span>
    );
  }
  if (task.source === "lecture_auto") {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-medium">
        Lecture
      </span>
    );
  }
  if (task.source === "event_auto") {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100 font-medium">
        From event
      </span>
    );
  }
  if (task.title.startsWith("Grade:")) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
        Grading
      </span>
    );
  }
  return null;
}

function RoutineClassRow({ slot, index }: { slot: RoutineSlot; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition bg-violet-50/30"
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-800 tracking-tight">
            {slot.course_code}
            <span className="text-slate-500 font-medium"> · Sec {slot.section_label}</span>
          </p>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200/80 font-semibold uppercase tracking-wider">
            Class
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {slot.course_title && <span>{slot.course_title}</span>}
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRoutineTimeRange(slot.starts_at, slot.ends_at)}
          </span>
          {slot.room && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {slot.room}
            </span>
          )}
        </p>
      </div>
      <div className="shrink-0 grid place-items-center w-9 h-9 rounded-full bg-violet-100 text-violet-600">
        <GraduationCap className="w-4 h-4" />
      </div>
    </motion.li>
  );
}

function TaskRow({
  task,
  index,
  variant,
  accentText,
  isStudent,
  onProgress,
  onSkip,
  onToggle,
}: {
  task: UserTask;
  index: number;
  variant: "dashboard" | "section";
  accentText: string;
  isStudent: boolean;
  onProgress: (p: number) => void;
  onSkip: () => void;
  onToggle: () => void;
}) {
  const isSlice = task.source === "event_slice";
  const isGrading = task.source === "grading_linked";
  const isExam = isStudent && isExamTask(task);
  const typeLabel = displayTaskTypeLabel(task, isStudent ? "student" : "faculty");
  const progress = sliceProgressPercent(task);
  const effTarget = Number(task.effective_target_percent ?? 100);
  const targetLabel =
    isSlice && task.effective_target_percent
      ? `${effTarget.toFixed(0)}% today`
      : null;
  const isDone = task.is_completed;
  const isSectionVariant = variant === "section";

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className={cn(
        "p-4 flex flex-col lg:flex-row lg:items-center gap-4 transition group",
        isDone
          ? isSectionVariant
            ? "bg-[#f6f9f4] border-l-2 border-[#7d9b76]"
            : "bg-emerald-50/50 border-l-2 border-emerald-400"
          : "hover:bg-white/80"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "font-semibold tracking-tight",
              isDone
                ? isSectionVariant
                  ? "text-[#5a7355]"
                  : "text-emerald-800/75"
                : "text-slate-800"
            )}
          >
            {task.title}
          </p>
          {task.priority_code && (
            <span
              className={cn(
                "text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider",
                isDone && "opacity-70",
                priorityTone[task.priority_code] ?? priorityTone.medium
              )}
            >
              {task.priority_code}
            </span>
          )}
          {typeLabel && (
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium",
                isDone && "opacity-70"
              )}
            >
              {typeLabel}
            </span>
          )}
          {sourceBadge(task)}
          {targetLabel && (
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full bg-violet-100/80 text-violet-800 font-semibold",
                isDone && "opacity-70"
              )}
            >
              Target {targetLabel}
            </span>
          )}
        </div>
        <p
          className={cn(
            "text-xs mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5",
            isDone
              ? isSectionVariant
                ? "text-[#7d9b76]/80"
                : "text-emerald-700/60"
              : "text-slate-500"
          )}
        >
          {task.course_code && (
            <span className={cn("font-mono font-semibold", isDone ? "inherit" : "text-slate-600")}>
              {task.course_code}
            </span>
          )}
          {task.due_at && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDue(task.due_at)}
            </span>
          )}
        </p>
        {task.attachment_url && (
          <a
            href={task.attachment_url}
            target="_blank"
            rel="noreferrer"
            className={cn("text-xs underline mt-1 inline-block font-medium", accentText)}
          >
            View attachment
          </a>
        )}
        {isExam && task.course_code && (
          <ExamStudyLinks courseCode={task.course_code} sectionKey={task.section_key} />
        )}
      </div>
      <div className="shrink-0">
        <TaskProgressControl
          percent={progress}
          completed={task.is_completed}
          onChange={onProgress}
          onToggleComplete={onToggle}
          onSkip={isGrading ? undefined : onSkip}
          variant={variant}
          disabled={isGrading}
          sliceTargetPercent={isSlice ? effTarget : undefined}
        />
      </div>
    </motion.li>
  );
}

function TaskSection({
  title,
  subtitle,
  tasks,
  variant,
  accentText,
  borderCls,
  cardBg,
  todayLoading,
  emptyHint,
  updateProgress,
  skipTask,
  toggleComplete,
  isStudent,
  routineSlots = [],
  routineLoading = false,
}: {
  title: string;
  subtitle: string;
  tasks: UserTask[];
  variant: "dashboard" | "section";
  accentText: string;
  borderCls: string;
  cardBg: string;
  todayLoading: boolean;
  emptyHint: string;
  updateProgress: (id: number, p: number, task?: UserTask) => Promise<void>;
  skipTask: (id: number) => Promise<void>;
  toggleComplete: (id: number, completed: boolean) => Promise<void>;
  isStudent: boolean;
  routineSlots?: RoutineSlot[];
  routineLoading?: boolean;
}) {
  const completed = tasks.filter((t) => t.is_completed).length;
  const total = tasks.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const openCount = total - completed;
  const classCount = routineSlots.length;
  const hasContent = classCount > 0 || total > 0;

  return (
    <div
      className={cn(
        "rounded-[1.25rem] border overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.015)]",
        borderCls,
        cardBg
      )}
    >
      <div className={cn("px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3", borderCls)}>
        <div>
          <p className="text-sm font-semibold text-slate-700">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className={cn("w-4 h-4", accentText)} />
          <span className="text-sm font-medium text-slate-600">
            {todayLoading || routineLoading
              ? "Loading…"
              : classCount > 0 && total === 0
                ? `${classCount} class${classCount === 1 ? "" : "es"} today`
                : openCount === 0
                  ? "All done"
                  : `${openCount} open`}
          </span>
          {!todayLoading && total > 0 && (
            <span className={cn("text-sm font-bold tabular-nums", accentText)}>{pct}%</span>
          )}
        </div>
      </div>

      {todayLoading ? (
        <div className="p-10 flex justify-center">
          <Loader2 className={cn("w-6 h-6 animate-spin", accentText)} />
        </div>
      ) : !hasContent && routineLoading ? (
        <div className="p-10 flex justify-center">
          <Loader2 className={cn("w-6 h-6 animate-spin", accentText)} />
        </div>
      ) : !hasContent ? (
        <p className="p-8 text-sm text-center text-slate-500 leading-relaxed">{emptyHint}</p>
      ) : (
        <ul className="divide-y divide-slate-100/80">
          <AnimatePresence initial={false}>
            {routineSlots.map((slot, index) => (
              <RoutineClassRow key={`routine-${slot.section_id}-${slot.meeting_time_id ?? index}`} slot={slot} index={index} />
            ))}
            {tasks.map((task, index) => (
              <TaskRow
                key={task.id}
                task={task}
                index={routineSlots.length + index}
                variant={variant}
                accentText={accentText}
                isStudent={isStudent}
                onProgress={(p) => void updateProgress(task.id, p, task)}
                onSkip={() => void skipTask(task.id)}
                onToggle={() => void toggleComplete(task.id, !task.is_completed, task)}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

export function TaskWorkspace({
  sectionKey,
  variant = "dashboard",
}: {
  sectionKey?: string;
  variant?: "dashboard" | "section";
} = {}) {
  const { profile } = useUserStats();
  const { slots: routineSlots, loading: routineLoading } = useRoutine();
  const {
    todayTasks: allTodayTasks,
    todayLoading,
    todayError,
    updateProgress,
    skipTask,
    toggleComplete,
  } = useTasks();

  const isSection = variant === "section";
  const isFacultyDashboard = !isSection && profile.role === "faculty";
  const isStudent = profile.role === "student";
  const accentText = isSection ? "text-[#7d9b76]" : "text-rose-600";
  const borderCls = isSection ? "border-[#dce5d4]/80" : "border-slate-200/80";
  const cardBg = isSection ? "bg-[#faf8f3]/30" : "bg-white";

  const todayTasks = sectionKey
    ? allTodayTasks.filter((t) => t.section_key === sectionKey)
    : allTodayTasks;

  const plannerTasks = openTasksFirst(todayTasks.filter(isPlannerTask));
  const scheduledTasks = openTasksFirst(todayTasks.filter((t) => !isPlannerTask(t)));

  const todayRoutine = useMemo(() => {
    const daySlots = slotsForDayIndex(routineSlots, new Date().getDay());
    if (!sectionKey) return daySlots;
    const [code, section] = sectionKey.split("::");
    return daySlots.filter(
      (s) => s.course_code === code && (!section || s.section_label === section)
    );
  }, [routineSlots, sectionKey]);

  const showDashboardSplit =
    !isSection && (profile.role === "student" || profile.role === "faculty");
  const showSplit =
    showDashboardSplit ||
    (!isSection && plannerTasks.length + scheduledTasks.length > 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-slate-800">
            {isSection ? "Section tasks" : isFacultyDashboard ? "Teaching tasks" : "Today's tasks"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isSection
              ? "Daily planner slices and scheduled items for this section."
              : "Planner work rolls unfinished progress forward. Scheduled items stay on their day."}
          </p>
        </div>
      </div>

      {todayError ? (
        <div
          className={cn(
            "rounded-[1.25rem] border p-10 text-sm text-center text-slate-500 leading-relaxed",
            borderCls,
            cardBg
          )}
        >
          Could not load tasks. Refresh the page — if this keeps happening, the server may need a moment.
        </div>
      ) : !todayLoading && todayTasks.length === 0 && !showDashboardSplit ? (
        <div
          className={cn(
            "rounded-[1.25rem] border p-10 text-sm text-center text-slate-500 leading-relaxed",
            borderCls,
            cardBg
          )}
        >
          {emptyStateCopy(isSection, isFacultyDashboard)}
        </div>
      ) : showSplit ? (
        <div className="space-y-5">
          <TaskSection
            title="Planner work"
            subtitle="Deadline slices with carryover — unfinished work rolls forward"
            tasks={plannerTasks}
            variant={variant}
            accentText={accentText}
            borderCls={borderCls}
            cardBg={cardBg}
            todayLoading={todayLoading}
            emptyHint="No planner slices today. Add a deadline event to start daily targets."
            updateProgress={updateProgress}
            skipTask={skipTask}
            toggleComplete={toggleComplete}
            isStudent={isStudent}
          />
          <TaskSection
            title="Scheduled"
            subtitle={
              isFacultyDashboard
                ? "Today's classes and one-time teaching items"
                : "Today's classes, habits, and one-time items"
            }
            tasks={scheduledTasks}
            routineSlots={todayRoutine}
            routineLoading={routineLoading}
            variant={variant}
            accentText={accentText}
            borderCls={borderCls}
            cardBg={cardBg}
            todayLoading={todayLoading}
            emptyHint="No classes or scheduled items today."
            updateProgress={updateProgress}
            skipTask={skipTask}
            toggleComplete={toggleComplete}
            isStudent={isStudent}
          />
        </div>
      ) : (
        <TaskSection
          title={isSection ? "Today" : "All tasks"}
          subtitle={
            isSection
              ? "Today's classes and section tasks"
              : "Sorted by urgency and your energy level"
          }
          tasks={openTasksFirst(todayTasks)}
          routineSlots={isSection ? todayRoutine : []}
          routineLoading={isSection ? routineLoading : false}
          variant={variant}
          accentText={accentText}
          borderCls={borderCls}
          cardBg={cardBg}
          todayLoading={todayLoading}
          emptyHint={emptyStateCopy(isSection, isFacultyDashboard)}
          updateProgress={updateProgress}
          skipTask={skipTask}
          toggleComplete={toggleComplete}
          isStudent={isStudent}
        />
      )}
    </section>
  );
}
