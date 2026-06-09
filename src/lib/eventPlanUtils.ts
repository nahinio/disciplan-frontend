import type { EventForm, EventType, Priority } from "@/components/dashboard/EventDialog";

const CODE_TO_TYPE: Record<string, EventType> = {
  ct: "CT",
  assignment: "Assignment",
  one_time: "One-time",
  personal_goal: "Personal",
  personal: "Personal",
  lecture_prep: "Lecture Prep",
  grading: "Grading",
  exam_quiz: "Exam/Quiz",
  meeting: "Meeting",
};

const PRIORITY_TO_LABEL: Record<string, Priority> = {
  low: "Low",
  medium: "Med",
  high: "High",
  urgent: "High",
};

function effortFromMinutes(mins?: number | null): number {
  if (!mins) return 3;
  return Math.min(5, Math.max(1, Math.round(mins / 30)));
}

function parseDateTime(value?: string | null): { date: Date | null; time: string } {
  if (!value) return { date: null, time: "23:59" };
  const d = new Date(value);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return { date: d, time: `${hh}:${mm}` };
}

export function planToEventForm(plan: Record<string, unknown>): EventForm {
  const mode = String(plan.scheduling_mode ?? "deadline_divide");
  const typeCode = String(plan.planner_task_type_code ?? "ct");
  let type = CODE_TO_TYPE[typeCode] ?? "One-time";

  const deadlineSource =
    mode === "recurring_weekly"
      ? null
      : mode === "one_time" || mode === "calendar_only"
        ? (plan.starts_at as string | undefined) ?? (plan.deadline_at as string | undefined)
        : (plan.deadline_at as string | undefined);

  const { date, time } = parseDateTime(deadlineSource);
  const recurrence = (plan.recurrence as Array<Record<string, unknown>> | undefined) ?? [];
  const slot = recurrence[0];

  if (type === "Personal" && mode === "recurring_weekly") {
    type = "Personal";
  }

  return {
    title: String(plan.title ?? ""),
    type,
    deadline: date,
    time,
    effort: effortFromMinutes(plan.estimated_effort_min as number | undefined),
    courseCode: plan.course_code ? String(plan.course_code) : undefined,
    section: plan.section_label ? String(plan.section_label) : undefined,
    syllabus: [],
    materialSource: "file",
    files: [],
    bookRef: "",
    notes: plan.description ? String(plan.description) : "",
    priority: PRIORITY_TO_LABEL[String(plan.priority_code ?? "medium")] ?? "Med",
    personalMode: mode === "recurring_weekly" ? "weekly" : "deadline",
    gradeComponentId: plan.grade_component_id ? Number(plan.grade_component_id) : undefined,
    recurrenceDay: slot?.day_of_week != null ? Number(slot.day_of_week) : 1,
    recurrenceTime: slot?.starts_time ? String(slot.starts_time).slice(0, 5) : "07:00",
  };
}

export type PlannerEventRef = {
  eventPlanId?: number | null;
  calendarEventId?: number | null;
  taskId?: number | null;
  isRoutine?: boolean;
};

export function canManagePlannerEvent(ref: PlannerEventRef): boolean {
  if (ref.isRoutine) return false;
  return Boolean(ref.eventPlanId || ref.calendarEventId || ref.taskId);
}
