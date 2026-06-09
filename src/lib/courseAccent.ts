export const COURSE_ACCENT_IDS = ["rose", "amber", "emerald", "sky", "violet"] as const;

export type CourseAccentId = (typeof COURSE_ACCENT_IDS)[number];

const ACCENT_STYLES: Record<
  CourseAccentId,
  { border: string; text: string; shadow: string }
> = {
  rose: {
    border: "border-rose-400/80",
    text: "text-rose-600",
    shadow: "shadow-[0_8px_24px_-16px_rgba(244,63,94,0.25)]",
  },
  amber: {
    border: "border-amber-400/80",
    text: "text-amber-600",
    shadow: "shadow-[0_8px_24px_-16px_rgba(245,158,11,0.25)]",
  },
  emerald: {
    border: "border-emerald-400/80",
    text: "text-emerald-600",
    shadow: "shadow-[0_8px_24px_-16px_rgba(16,185,129,0.25)]",
  },
  sky: {
    border: "border-sky-400/80",
    text: "text-sky-600",
    shadow: "shadow-[0_8px_24px_-16px_rgba(14,165,233,0.25)]",
  },
  violet: {
    border: "border-violet-400/80",
    text: "text-violet-600",
    shadow: "shadow-[0_8px_24px_-16px_rgba(139,92,246,0.25)]",
  },
};

/** Stable pseudo-random accent per course section — same course always gets the same color. */
export function accentForCourseKey(key: string): CourseAccentId {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return COURSE_ACCENT_IDS[hash % COURSE_ACCENT_IDS.length];
}

export function courseAccentStyles(key: string) {
  return ACCENT_STYLES[accentForCourseKey(key)];
}
