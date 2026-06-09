/** True once the calendar day of the deadline has fully ended (local time). */
export function isDeadlineDayEnded(due: Date): boolean {
  const end = new Date(due);
  end.setHours(23, 59, 59, 999);
  return Date.now() > end.getTime();
}

export function startOfCalendarDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return startOfCalendarDay(a).getTime() === startOfCalendarDay(b).getTime();
}

/** True once the given calendar day has fully ended (local time). */
export function isCalendarDayEnded(d: Date): boolean {
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return Date.now() > end.getTime();
}

export function taskSliceDate(task: {
  slice_date?: string | null;
  due_at?: string | null;
}): Date | null {
  if (task.slice_date) {
    const [y, m, day] = task.slice_date.split("-").map(Number);
    if (!y || !m || !day) return null;
    return new Date(y, m - 1, day);
  }
  if (task.due_at) return new Date(task.due_at);
  return null;
}
