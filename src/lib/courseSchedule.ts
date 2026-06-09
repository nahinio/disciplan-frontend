export type CourseTypeCode = "theory" | "lab";

export type TheoryScheduleKey = "sat_tue" | "sun_wed";
export type LabScheduleKey = "sat" | "sun" | "mon" | "tue" | "wed";
export type ScheduleKey = TheoryScheduleKey | LabScheduleKey;

export const COURSE_TYPES: {
  code: CourseTypeCode;
  label: string;
  durationMinutes: number;
  durationLabel: string;
}[] = [
  { code: "theory", label: "Theory", durationMinutes: 80, durationLabel: "1h 20m" },
  { code: "lab", label: "Lab", durationMinutes: 150, durationLabel: "2h 30m" },
];

export const THEORY_SCHEDULE_OPTIONS: { key: TheoryScheduleKey; label: string }[] = [
  { key: "sat_tue", label: "Saturday – Tuesday" },
  { key: "sun_wed", label: "Sunday – Wednesday" },
];

export const LAB_SCHEDULE_OPTIONS: { key: LabScheduleKey; label: string }[] = [
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
];

export function formatDurationMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

export function courseTypeMeta(code?: string) {
  return COURSE_TYPES.find((t) => t.code === code) ?? COURSE_TYPES[0];
}

export function scheduleOptionsForType(courseTypeCode?: string) {
  return courseTypeCode === "lab" ? LAB_SCHEDULE_OPTIONS : THEORY_SCHEDULE_OPTIONS;
}

export function defaultScheduleKey(courseTypeCode?: string): ScheduleKey {
  return courseTypeCode === "lab" ? "sat" : "sat_tue";
}

export function scheduleOptionLabel(
  courseTypeCode: string | undefined,
  scheduleKey: string | undefined
): string {
  if (!scheduleKey) return "—";
  const options = scheduleOptionsForType(courseTypeCode);
  return options.find((o) => o.key === scheduleKey)?.label ?? scheduleKey;
}
