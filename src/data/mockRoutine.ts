/** Routine domain types (API-backed; no demo seed data). */

export interface CourseOffering {
  program: string;
  course_code: string;
  title: string;
  section: string;
  rooms: string[];
  days: string[];
  times: string[];
  faculty_name: string;
  faculty_initial: string;
  credit: number;
}

export const ROUTINE_DATA: CourseOffering[] = [];

export function listPrograms(): string[] {
  return [];
}

export function listCourseCodes(): { code: string; title: string }[] {
  return [];
}

export function listSectionsForCourse(_courseCode: string): string[] {
  return [];
}

export function findOffering(_courseCode: string, _section: string): CourseOffering | undefined {
  return undefined;
}
