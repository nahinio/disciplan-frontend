/** Shared calendar/task display types (no demo seed data). */

export type CalEventType =
  | "personal"
  | "team"
  | "deadline"
  | "lecture"
  | "office-hours"
  | "grading"
  | "exam-quiz"
  | "meeting"
  | "class";

export type CalEvent = {
  id: string;
  title: string;
  date: Date;
  type: CalEventType;
  eventPlanId?: number | null;
  calendarEventId?: number | null;
  taskId?: number | null;
  isRoutine?: boolean;
};

export type Task = {
  id: string;
  title: string;
  course: string;
  due: Date;
  start: Date;
  priority: "High" | "Med" | "Low";
  completionPercent?: number;
};

export { countdown } from "@/lib/countdown";
