import type { CourseOffering } from "@/types/course";
import type { CatalogueCourse } from "@/data/mockCatalogue";

export function mapCatalogueCourse(raw: Record<string, unknown>): CatalogueCourse {
  const courseTypeCode = String(raw.course_type_code ?? "theory");
  return {
    code: String(raw.code ?? ""),
    title: String(raw.title ?? ""),
    credit: Number(raw.credit_hours ?? raw.credit ?? 3),
    department: String(raw.department_code ?? raw.department ?? "CSE"),
    description: String(raw.description ?? ""),
    has_project: Boolean(raw.has_project),
    course_type_code: courseTypeCode === "lab" ? "lab" : "theory",
    course_type_label: raw.course_type_label ? String(raw.course_type_label) : undefined,
    class_duration_minutes:
      raw.class_duration_minutes != null
        ? Number(raw.class_duration_minutes)
        : courseTypeCode === "lab"
          ? 150
          : 80,
  };
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 3).toUpperCase() || "—";
}

export function mapApiOffering(raw: Record<string, unknown>): CourseOffering {
  const faculty = Array.isArray(raw.faculty) ? (raw.faculty as string[]) : [];
  const facultyName = faculty[0] ?? "—";
  const room = raw.room ? String(raw.room) : "";
  return {
    section_id: raw.section_id != null ? Number(raw.section_id) : undefined,
    program: String(raw.program ?? "BSCSE"),
    course_code: String(raw.course_code ?? ""),
    title: String(raw.title ?? ""),
    section: String(raw.section ?? ""),
    rooms: room ? [room] : [],
    days: Array.isArray(raw.days) ? (raw.days as string[]) : [],
    times: Array.isArray(raw.times) ? (raw.times as string[]) : [],
    faculty_name: facultyName,
    faculty_initial: initialsFromName(facultyName),
    credit: Number(raw.credit ?? 3),
    has_project: Boolean(raw.has_project),
    semester_label: raw.semester_label ? String(raw.semester_label) : undefined,
  };
}

export function sectionKey(courseCode: string, section: string): string {
  return `${courseCode}::${section}`;
}
