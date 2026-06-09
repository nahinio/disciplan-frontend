import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

/** Invalidate caches that should stay in sync after planner / calendar changes. */
export function invalidatePlannerData(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
  void qc.invalidateQueries({ queryKey: queryKeys.tasks.today });
  void qc.invalidateQueries({ queryKey: queryKeys.tasks.eventPlans });
  void qc.invalidateQueries({ queryKey: queryKeys.calendar.events(true) });
  void qc.invalidateQueries({ queryKey: queryKeys.calendar.events(false) });
}

/** After admin/faculty publishes course content (topics, problems, blogs). */
export function invalidateCourseContent(qc: QueryClient, courseCode?: string) {
  if (courseCode) {
    void qc.invalidateQueries({ queryKey: ["practice", "topics", courseCode] });
    void qc.invalidateQueries({ queryKey: ["practice", "problems", courseCode] });
    void qc.invalidateQueries({ queryKey: ["practice", "past-papers", courseCode] });
    void qc.invalidateQueries({ queryKey: ["blogs", courseCode] });
    void qc.invalidateQueries({ queryKey: ["forum", "threads", courseCode] });
  } else {
    void qc.invalidateQueries({ queryKey: ["practice"] });
    void qc.invalidateQueries({ queryKey: ["blogs"] });
    void qc.invalidateQueries({ queryKey: ["forum"] });
  }
  void qc.invalidateQueries({ queryKey: queryKeys.catalogue });
  void qc.invalidateQueries({ queryKey: queryKeys.admin.contentStats });
}

/** Section hub tabs (announcements, doubts, assignments, etc.). */
export function invalidateSectionHub(
  qc: QueryClient,
  courseCode: string,
  sectionLabel: string
) {
  void qc.invalidateQueries({
    queryKey: queryKeys.section.hub(courseCode, sectionLabel),
  });
  void qc.invalidateQueries({
    queryKey: queryKeys.section.grades(courseCode, sectionLabel),
  });
  void qc.invalidateQueries({
    queryKey: queryKeys.section.resources(courseCode, sectionLabel),
  });
  void qc.invalidateQueries({
    queryKey: queryKeys.section.teams(courseCode, sectionLabel),
  });
  void qc.invalidateQueries({
    queryKey: queryKeys.section.practice(courseCode, sectionLabel),
  });
}
