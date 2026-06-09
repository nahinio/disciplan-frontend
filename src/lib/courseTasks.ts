import type { UserTask } from "@/hooks/useTasks";

export function pendingTasksFor(courseCode: string, todayTasks: UserTask[] = []): UserTask[] {
  return todayTasks.filter(
    (t) =>
      t.course_code === courseCode &&
      !t.is_completed &&
      !t.is_skipped &&
      (t.completion_percent ?? 0) < 100
  );
}

const dayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function nextClassLabel(days: string[], times: string[]): string {
  if (!days.length) return "—";
  const today = new Date().getDay();
  let bestDelta = 8;
  let bestIdx = 0;
  days.forEach((d, i) => {
    const idx = dayOrder.indexOf(d);
    if (idx === -1) return;
    let delta = idx - today;
    if (delta < 0) delta += 7;
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIdx = i;
    }
  });
  const when = bestDelta === 0 ? "Today" : bestDelta === 1 ? "Tomorrow" : days[bestIdx];
  const startTime = (times[bestIdx] ?? times[0]).split(" - ")[0];
  return `${when} · ${startTime}`;
}
