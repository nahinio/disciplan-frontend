import type { CalEvent } from "@/lib/dashboard-data";

export interface RoutineSlot {
  section_id: number;
  course_code: string;
  course_title: string;
  section_label: string;
  room?: string;
  day_code?: string;
  day_label?: string;
  day_sort_order?: number;
  meeting_time_id?: number;
  starts_at?: string;
  ends_at?: string;
}

export const WEEK_DAYS = [
  { code: "SUN", label: "Sunday", short: "Sun", sort: 0 },
  { code: "MON", label: "Monday", short: "Mon", sort: 1 },
  { code: "TUE", label: "Tuesday", short: "Tue", sort: 2 },
  { code: "WED", label: "Wednesday", short: "Wed", sort: 3 },
  { code: "THU", label: "Thursday", short: "Thu", sort: 4 },
  { code: "FRI", label: "Friday", short: "Fri", sort: 5 },
  { code: "SAT", label: "Saturday", short: "Sat", sort: 6 },
] as const;

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

export function formatRoutineTime(value?: string): string {
  if (!value) return "";
  const part = value.includes("T") ? value.split("T")[1] : value;
  const [h, m] = part.split(":").map(Number);
  if (Number.isNaN(h)) return "";
  const d = new Date();
  d.setHours(h, m ?? 0, 0, 0);
  return d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
}

export function formatRoutineTimeRange(starts?: string, ends?: string): string {
  const start = formatRoutineTime(starts);
  const end = formatRoutineTime(ends);
  if (start && end) return `${start} – ${end}`;
  return start || end || "Time TBA";
}

function atDate(date: Date, timeStr?: string): Date {
  const d = new Date(date);
  if (!timeStr) {
    d.setHours(9, 0, 0, 0);
    return d;
  }
  const part = timeStr.includes("T") ? timeStr.split("T")[1] : timeStr;
  const [hh, mm] = part.split(":").map(Number);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
}

function slotMatchesDay(slot: RoutineSlot, dayIndex: number): boolean {
  const code = DAY_CODES[dayIndex];
  if (slot.day_code?.toUpperCase() === code) return true;
  const short = WEEK_DAYS[dayIndex].short.toLowerCase();
  const label = slot.day_label?.toLowerCase() ?? "";
  return label.startsWith(short) || label.startsWith(WEEK_DAYS[dayIndex].label.toLowerCase());
}

export function slotsForDayIndex(slots: RoutineSlot[], dayIndex: number): RoutineSlot[] {
  return slots
    .filter((s) => slotMatchesDay(s, dayIndex))
    .sort((a, b) => {
      const ta = a.starts_at ?? "";
      const tb = b.starts_at ?? "";
      return ta.localeCompare(tb);
    });
}

export function groupRoutineByDay(slots: RoutineSlot[]) {
  return WEEK_DAYS.map((day, idx) => ({
    ...day,
    items: slotsForDayIndex(slots, idx),
  }));
}

export function routineEventsForDate(slots: RoutineSlot[], date: Date): CalEvent[] {
  const dayIndex = date.getDay();
  return slotsForDayIndex(slots, dayIndex).map((s) => ({
    id: `routine-${s.section_id}-${s.meeting_time_id ?? 0}-${date.toISOString().slice(0, 10)}`,
    title: `${s.course_code} · Sec ${s.section_label}`,
    date: atDate(date, s.starts_at),
    type: "class" as const,
    isRoutine: true,
  }));
}
