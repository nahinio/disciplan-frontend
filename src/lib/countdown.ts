/** Time-until-deadline label for task cards. */
export function countdown(due: Date): string {
  const ms = due.getTime() - Date.now();
  if (ms <= 0) return "Due now";
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}
