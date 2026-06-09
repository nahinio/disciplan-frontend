export function timeGreeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function firstName(fullName?: string | null): string {
  if (!fullName?.trim()) return "there";
  return fullName.trim().split(/\s+/)[0] ?? "there";
}
