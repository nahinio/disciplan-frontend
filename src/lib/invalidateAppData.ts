import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

/** Invalidate caches that should stay in sync after planner / calendar changes. */
export async function invalidatePlannerData(qc: QueryClient) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.tasks.all }),
    qc.invalidateQueries({ queryKey: queryKeys.tasks.today }),
    qc.invalidateQueries({ queryKey: queryKeys.tasks.eventPlans }),
    qc.invalidateQueries({ queryKey: queryKeys.calendar.events(true) }),
    qc.invalidateQueries({ queryKey: queryKeys.calendar.events(false) }),
  ]);
}

/** After admin/faculty publishes course content (topics, problems, blogs). */
export async function invalidateCourseContent(qc: QueryClient, courseCode?: string) {
  if (courseCode) {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["practice", "topics", courseCode] }),
      qc.invalidateQueries({ queryKey: ["practice", "problems", courseCode] }),
      qc.invalidateQueries({ queryKey: ["practice", "past-papers", courseCode] }),
      qc.invalidateQueries({ queryKey: ["blogs", courseCode] }),
      qc.invalidateQueries({ queryKey: ["forum", "threads", courseCode] }),
      qc.invalidateQueries({ queryKey: ["forum", "feed"] }),
    ]);
  } else {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["practice"] }),
      qc.invalidateQueries({ queryKey: ["blogs"] }),
      qc.invalidateQueries({ queryKey: ["forum"] }),
    ]);
  }
  await Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.catalogue }),
    qc.invalidateQueries({ queryKey: queryKeys.admin.contentStats }),
  ]);
}

/** Section hub tabs (announcements, doubts, assignments, etc.). */
export async function invalidateSectionHub(
  qc: QueryClient,
  courseCode: string,
  sectionLabel: string
) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.section.hub(courseCode, sectionLabel) }),
    qc.invalidateQueries({ queryKey: queryKeys.section.grades(courseCode, sectionLabel) }),
    qc.invalidateQueries({ queryKey: queryKeys.section.resources(courseCode, sectionLabel) }),
    qc.invalidateQueries({ queryKey: queryKeys.section.teams(courseCode, sectionLabel) }),
    qc.invalidateQueries({ queryKey: queryKeys.section.practice(courseCode, sectionLabel) }),
  ]);
}

/** After enrollment, catalogue, or routine changes. */
export async function invalidateEnrollmentData(qc: QueryClient) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.offerings }),
    qc.invalidateQueries({ queryKey: queryKeys.catalogue }),
    qc.invalidateQueries({ queryKey: queryKeys.routine }),
  ]);
}

/** After forum CRUD (global or course-scoped). */
export async function invalidateForumData(qc: QueryClient, courseCode?: string) {
  if (courseCode) {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["forum", "threads", courseCode] }),
      qc.invalidateQueries({ queryKey: ["forum", "feed"] }),
    ]);
  } else {
    await qc.invalidateQueries({ queryKey: ["forum"] });
  }
}

/** After doubt CRUD in section hub or faculty dashboard. */
export async function invalidateDoubtsData(
  qc: QueryClient,
  courseCode?: string,
  sectionLabel?: string
) {
  await qc.invalidateQueries({ queryKey: ["doubts"] });
  if (courseCode && sectionLabel) {
    await invalidateSectionHub(qc, courseCode, sectionLabel);
  }
}

export interface InvalidateAdminWritesOptions {
  courseCode?: string;
  enrollment?: boolean;
  forum?: boolean;
  doubts?: boolean;
  sectionLabel?: string;
}

/** After admin writes that affect student/faculty views. */
export async function invalidateAdminWrites(
  qc: QueryClient,
  opts: InvalidateAdminWritesOptions = {}
) {
  const tasks: Promise<unknown>[] = [
    qc.invalidateQueries({ queryKey: queryKeys.admin.all }),
    qc.invalidateQueries({ queryKey: queryKeys.admin.contentStats }),
  ];
  if (opts.enrollment) {
    tasks.push(invalidateEnrollmentData(qc));
  }
  if (opts.courseCode) {
    tasks.push(invalidateCourseContent(qc, opts.courseCode));
  } else if (opts.enrollment) {
    tasks.push(invalidateCourseContent(qc));
  }
  if (opts.forum) {
    tasks.push(invalidateForumData(qc, opts.courseCode));
  }
  if (opts.doubts && opts.courseCode && opts.sectionLabel) {
    tasks.push(invalidateDoubtsData(qc, opts.courseCode, opts.sectionLabel));
  }
  await Promise.all(tasks);
}
