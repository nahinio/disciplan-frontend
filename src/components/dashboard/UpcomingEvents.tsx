import { motion } from "framer-motion";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { countdown, type Task } from "@/lib/dashboard-data";
import {
  isDeadlineDayEnded,
  isSameCalendarDay,
  isCalendarDayEnded,
  taskSliceDate,
} from "@/lib/deadlineUtils";
import { useTasks, taskDifficulty, sliceProgressPercent, type UserTask } from "@/hooks/useTasks";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { isAuthenticated } from "@/lib/auth";
import { ScheduleEventButton } from "./ScheduleEventButton";
import { EventPlanMenu } from "./EventPlanMenu";

const priorityClass: Record<Task["priority"], string> = {
  High: "bg-rose text-white",
  Med: "bg-amber-400 text-amber-950",
  Low: "bg-emerald-400 text-emerald-950",
};

type UpcomingItem = Task & {
  completionPercent: number;
  eventPlanId?: number | null;
  taskId?: number | null;
};

function priorityForType(typeCode: string, priority?: string | null): Task["priority"] {
  if (typeCode === "ct" || typeCode === "exam_quiz") return "High";
  if (typeCode === "assignment") return "Med";
  if (priority) {
    const diff = taskDifficulty(priority);
    if (diff === "Hard") return "High";
    if (diff === "Easy") return "Low";
  }
  return "Med";
}

function planProgressFromTasks(tasks: UserTask[]): number {
  const sliceTasks = tasks.filter((t) => t.source === "event_slice");
  if (sliceTasks.length > 0) {
    const totalTarget = sliceTasks.reduce(
      (sum, t) => sum + Number(t.effective_target_percent ?? 100),
      0
    );
    const totalDone = sliceTasks.reduce(
      (sum, t) => sum + Number(t.completed_portion_percent ?? 0),
      0
    );
    if (totalTarget > 0) {
      return Math.min(100, Math.round((totalDone / totalTarget) * 100));
    }
  }
  const open = tasks.filter((t) => !t.is_completed && !t.is_skipped);
  if (open.length === 0 && tasks.some((t) => t.is_completed)) return 100;
  return Math.min(
    100,
    Math.round(
      tasks.reduce((sum, t) => sum + Number(t.completion_percent ?? 0), 0) /
        Math.max(1, tasks.length)
    )
  );
}

function todaySliceTasks(tasks: UserTask[]): UserTask[] {
  const now = new Date();
  return tasks.filter((t) => {
    const d = taskSliceDate(t);
    return d != null && isSameCalendarDay(d, now);
  });
}

/** Keep event visible at 100% for the rest of today after today's slice is finished. */
function showAsTodayComplete(tasks: UserTask[]): boolean {
  const todaySlices = todaySliceTasks(tasks);
  if (todaySlices.length === 0) return false;
  const allDone = todaySlices.every(
    (t) => t.is_completed || sliceProgressPercent(t) >= 100
  );
  return allDone && !isCalendarDayEnded(new Date());
}

function groupTasksByPlan(tasks: UserTask[]): Map<number, UserTask[]> {
  const map = new Map<number, UserTask[]>();
  for (const t of tasks) {
    if (!t.event_plan_id || !t.due_at || t.is_skipped) continue;
    const list = map.get(t.event_plan_id) ?? [];
    list.push(t);
    map.set(t.event_plan_id, list);
  }
  return map;
}

function mapTask(t: UserTask): UpcomingItem {
  const due = new Date(t.due_at!);
  const start = new Date(due.getTime() - 7 * 24 * 3600000);
  const diff = taskDifficulty(t.priority_code);
  const priority = diff === "Hard" ? "High" : diff === "Easy" ? "Low" : "Med";
  return {
    id: String(t.id),
    title: t.title,
    course: t.course_code ?? "Personal",
    due,
    start,
    priority,
    completionPercent: t.is_completed ? 100 : sliceProgressPercent(t),
    eventPlanId: t.event_plan_id ?? null,
    taskId: t.id,
  };
}

function buildPlanItem(
  planId: number,
  plan: Record<string, unknown> | undefined,
  tasks: UserTask[]
): UpcomingItem | null {
  if (!plan && tasks.length === 0) return null;

  const planDeadline = plan?.deadline_at ? new Date(String(plan.deadline_at)) : null;
  const latestTaskDue =
    tasks.length > 0
      ? new Date(Math.max(...tasks.map((t) => new Date(t.due_at!).getTime())))
      : null;
  const due = planDeadline ?? latestTaskDue;
  if (!due || isDeadlineDayEnded(due)) return null;

  const openTasks = tasks.filter((t) => !t.is_completed && !t.is_skipped);
  const todayComplete = showAsTodayComplete(tasks);
  const isDivided = plan ? plan.scheduling_mode === "deadline_divide" : false;
  const progress = (plan && isDivided)
    ? Math.round(Number(plan.plan_completed_percent ?? 0))
    : planProgressFromTasks(tasks);

  const planMarkedDone =
    Boolean(plan?.is_completed) || Number(plan?.plan_completed_percent ?? 0) >= 100;

  if (!todayComplete) {
    if (planMarkedDone && openTasks.length === 0) return null;
    if (openTasks.length === 0 && progress >= 100) return null;
  }

  const displayProgress = progress;
  const rep = openTasks[0] ?? tasks[0];
  const typeCode = String(plan?.planner_task_type_code ?? rep?.planner_task_type_code ?? "");

  return {
    id: `plan-${planId}`,
    title: String(plan?.title ?? rep?.title ?? "Event"),
    course: plan?.course_code
      ? String(plan.course_code)
      : (rep?.course_code ?? "Personal"),
    due,
    start: new Date(due.getTime() - 7 * 24 * 3600000),
    priority: priorityForType(typeCode, rep?.priority_code),
    completionPercent: displayProgress,
    eventPlanId: planId,
    taskId: rep?.id ?? null,
  };
}

function TideCard({ task }: { task: UpcomingItem }) {
  const fillPct = Math.round(task.completionPercent);
  const isDone = fillPct >= 100;

  return (
    <div
      className={cn(
        "relative shrink-0 w-64 h-72 rounded-2xl border bg-card overflow-hidden shadow-[0_1px_0_rgba(0,0,0,0.02),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all duration-300",
        isDone ? "border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]" : "border-border"
      )}
    >
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: `${fillPct}%` }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "absolute inset-x-0 bottom-0",
          isDone
            ? "bg-gradient-to-t from-emerald-500/35 via-emerald-500/25 to-emerald-500/15"
            : "bg-gradient-to-t from-emerald-500/40 via-emerald-500/10 to-transparent"
        )}
      />

      <div className="relative h-full p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {task.course}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${priorityClass[task.priority]}`}
            >
              {task.priority}
            </span>
            <EventPlanMenu
              eventRef={{
                eventPlanId: task.eventPlanId,
                taskId: task.taskId,
              }}
            />
          </div>
        </div>

        <div>
          <h3 className="font-display text-xl font-semibold leading-tight">{task.title}</h3>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Due in</p>
            <p className="font-display text-2xl font-semibold tabular-nums">{countdown(task.due)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Progress</p>
            <p className="font-display text-2xl font-semibold tabular-nums text-emerald-600">{fillPct}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UpcomingEvents() {
  const { tasks: apiTasks } = useTasks();
  const plansQuery = useQuery({
    queryKey: queryKeys.tasks.eventPlans,
    queryFn: async () => {
      const res = await api.listEventPlans();
      return (res.items ?? []) as Record<string, unknown>[];
    },
    enabled: isAuthenticated(),
  });

  const sorted = useMemo(() => {
    const plans = plansQuery.data ?? [];
    const planById = new Map(plans.map((p) => [Number(p.id), p]));
    const tasksByPlan = groupTasksByPlan(apiTasks);
    const seenPlanIds = new Set<number>();
    const items: UpcomingItem[] = [];

    const allPlanIds = new Set<number>([
      ...plans.map((p) => Number(p.id)),
      ...tasksByPlan.keys(),
    ]);

    for (const planId of allPlanIds) {
      if (seenPlanIds.has(planId)) continue;
      const plan = planById.get(planId);
      const tasks = tasksByPlan.get(planId) ?? [];
      const item = buildPlanItem(planId, plan, tasks);
      if (item) {
        items.push(item);
        seenPlanIds.add(planId);
      }
    }

    for (const t of apiTasks) {
      if (t.event_plan_id || t.is_skipped || !t.due_at) continue;
      if (t.is_completed) {
        const due = new Date(t.due_at);
        if (!isSameCalendarDay(due, new Date()) || isCalendarDayEnded(due)) continue;
      }
      const item = mapTask(t);
      if (!isDeadlineDayEnded(item.due)) items.push(item);
    }

    return items.sort((a, b) => a.due.getTime() - b.due.getTime());
  }, [apiTasks, plansQuery.data]);

  return (
    <section>
      <div className="flex items-end justify-between mb-4 gap-4">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Upcoming Events</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your next deadlines, ordered by what's due first.
          </p>
        </div>
        <ScheduleEventButton label="Add Event" size="md" />
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
          {sorted.map((t) => (
            <TideCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </section>
  );
}
