import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { encodeCourseCode } from "@/lib/blog";
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
  onUpdateTask,
}: {
  task: UserTask;
  index: number;
  variant: "dashboard" | "section";
  accentText: string;
  isStudent: boolean;
  onProgress: (p: number) => void;
  onSkip: () => void;
  onToggle: () => void;
  onUpdateTask?: (id: number, body: Record<string, any>) => Promise<void>;
}) {
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
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
            {(task.source === "grading_linked" || task.title.startsWith("Grade:") || task.task_type_code === "grading") && task.course_code ? (
              <Link
                to="/courses/$courseCode/section"
                params={{ courseCode: encodeCourseCode(task.course_code) }}
                search={{
                  section: task.section_key ? task.section_key.split("::")[1] || "" : "",
                  tab: "students"
                }}
                className={cn(
                  "hover:underline cursor-pointer",
                  isSectionVariant ? "hover:text-[#7d9b76]" : "hover:text-rose-600"
                )}
              >
                {task.title}
              </Link>
            ) : (
              task.title
            )}
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
        {!isStudent && task.source === "grading_linked" && (
          <div className="mt-2.5">
            {isEditingDeadline ? (
              <div className="p-3 rounded-xl border border-rose-100 bg-rose-50/35 dark:border-rose-950/20 dark:bg-rose-950/5 flex flex-col gap-2 max-w-sm">
                <span className="text-[9px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                  {task.due_at ? "Change grading deadline" : "No deadline set. Add a grading deadline?"}
                </span>
                <div className="flex gap-2 items-center">
                  <input
                    type="datetime-local"
                    defaultValue={task.due_at ? task.due_at.slice(0, 16) : ""}
                    className="h-8 px-2 rounded-lg border border-rose-250 bg-white text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-colors"
                    id={`deadline-input-${task.id}`}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const input = document.getElementById(`deadline-input-${task.id}`) as HTMLInputElement;
                      if (input && input.value) {
                        const dueAtIso = new Date(input.value).toISOString();
                        if (onUpdateTask) {
                          await onUpdateTask(task.id, { due_at: dueAtIso });
                        }
                        setIsEditingDeadline(false);
                      }
                    }}
                    className="h-8 px-3 rounded-lg bg-rose text-white text-[10px] font-bold shadow-sm hover:bg-rose/90 transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingDeadline(false)}
                    className="h-8 px-2 rounded-lg border border-slate-200 text-slate-500 text-[10px] font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : task.due_at ? (
              <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider text-[9px]">Deadline:</span>
                <span className="font-semibold">
                  {new Date(task.due_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingDeadline(true)}
                  className="text-[10px] font-bold text-rose hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingDeadline(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rose-200 bg-rose-50/30 hover:bg-rose-50 text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 text-[10px] font-bold transition-colors cursor-pointer"
              >
                Prompt: Add Deadline
              </button>
            )}
          </div>
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
  onUpdateTask,
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
  toggleComplete: (id: number, completed: boolean, task?: UserTask) => Promise<void>;
  isStudent: boolean;
  routineSlots?: RoutineSlot[];
  routineLoading?: boolean;
  onUpdateTask?: (id: number, body: Record<string, any>) => Promise<void>;
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
                onUpdateTask={onUpdateTask}
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
    updateTask,
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

  const [sortMethod, setSortMethod] = useState<"default" | "energy">("default");
  const [energySlider, setEnergySlider] = useState<number>(2); // 1 = Low, 2 = Medium, 3 = High, 4 = Peak

  const sortTasks = (tasksList: UserTask[]) => {
    const open = tasksList.filter((t) => !t.is_completed);
    const done = tasksList.filter((t) => t.is_completed);

    const sortFn = (a: UserTask, b: UserTask) => {
      if (sortMethod === "default") {
        const priorityValue: Record<string, number> = {
          urgent: 4,
          high: 3,
          medium: 2,
          low: 1,
        };
        const valA = priorityValue[a.priority_code || "medium"] ?? 2;
        const valB = priorityValue[b.priority_code || "medium"] ?? 2;
        if (valB !== valA) return valB - valA;
        const wA = a.live_weight ?? a.computed_weight ?? 0;
        const wB = b.live_weight ?? b.computed_weight ?? 0;
        if (wB !== wA) return wB - wA;
        return a.id - b.id;
      } else {
        const effortA = a.estimated_effort_min;
        const effortB = b.estimated_effort_min;

        const hasEffortA = effortA !== null && effortA !== undefined;
        const hasEffortB = effortB !== null && effortB !== undefined;

        if (!hasEffortA && !hasEffortB) return 0;
        if (!hasEffortA) return 1;
        if (!hasEffortB) return -1;

        if (energySlider <= 2) {
          if (effortA !== effortB) return effortA! - effortB!;
        } else {
          if (effortA !== effortB) return effortB! - effortA!;
        }
        const wA = a.live_weight ?? a.computed_weight ?? 0;
        const wB = b.live_weight ?? b.computed_weight ?? 0;
        if (wB !== wA) return wB - wA;
        return a.id - b.id;
      }
    };

    return [...open.sort(sortFn), ...done.sort(sortFn)];
  };

  const plannerTasks = sortTasks(todayTasks.filter(isPlannerTask));
  const scheduledTasks = sortTasks(todayTasks.filter((t) => !isPlannerTask(t)));

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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-250/50 bg-slate-50/40 backdrop-blur-sm shadow-[0_4px_20px_rgb(0,0,0,0.01)]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sort by:</span>
          <div className="inline-flex p-0.5 rounded-full bg-slate-100/80 border border-slate-200/40">
            <button
              onClick={() => setSortMethod("default")}
              className={`text-[10px] font-bold uppercase tracking-wider py-1.5 px-3.5 rounded-full transition-all cursor-pointer ${
                sortMethod === "default"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Priority (Default)
            </button>
            <button
              onClick={() => setSortMethod("energy")}
              className={`text-[10px] font-bold uppercase tracking-wider py-1.5 px-3.5 rounded-full transition-all cursor-pointer ${
                sortMethod === "energy"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Energy Match
            </button>
          </div>
        </div>

        {sortMethod === "energy" && (
          <div className="flex items-center gap-2 flex-1 sm:justify-end">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Energy Match:
            </span>
            <div className="inline-flex p-0.5 rounded-full bg-slate-100/80 border border-slate-200/40">
              {([
                { value: 1, label: "Low" },
                { value: 2, label: "Medium" },
                { value: 3, label: "High" },
                { value: 4, label: "Peak" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEnergySlider(opt.value)}
                  className={`text-[10px] font-bold uppercase tracking-wider py-1 px-3.5 rounded-full transition-all cursor-pointer ${
                    energySlider === opt.value
                      ? "bg-rose-600 text-white shadow-sm font-semibold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
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
            onUpdateTask={updateTask}
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
            onUpdateTask={updateTask}
          />
        </div>
      ) : (
        <TaskSection
          title={isSection ? "Today" : "All tasks"}
          subtitle={
            isSection
              ? "Today's classes and section tasks"
              : "Sorted by priority and your energy level"
          }
          tasks={sortTasks(todayTasks)}
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
          onUpdateTask={updateTask}
        />
      )}
    </section>
  );
}
