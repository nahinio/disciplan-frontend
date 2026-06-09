export function getSubmissionTimingStatus(
  submittedAtStr: string,
  deadlineStr: string
): { status: "early" | "late"; text: string } {
  const submittedAt = new Date(submittedAtStr);
  const deadline = new Date(deadlineStr);
  const diffMs = submittedAt.getTime() - deadline.getTime();

  if (diffMs <= 0) {
    return { status: "early", text: "Submitted early" };
  }

  const diffMins = Math.ceil(diffMs / (1000 * 60));
  if (diffMins < 60) {
    return { status: "late", text: `Submitted ${diffMins} min${diffMins > 1 ? "s" : ""} late` };
  }
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) {
    return { status: "late", text: `Submitted ${diffHours} hour${diffHours > 1 ? "s" : ""} late` };
  }
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return { status: "late", text: `Submitted ${diffDays} day${diffDays > 1 ? "s" : ""} late` };
}
