import { cn } from "@/lib/utils";

type Gender = "male" | "female";

function PortraitIcon({ gender }: { gender: Gender }) {
  if (gender === "male") {
    return (
      <svg viewBox="0 0 48 56" className="h-[52px] w-10 shrink-0" fill="none" aria-hidden>
        <path
          d="M24 4c-6 0-10 5-10 11 0 4 2 7 4 9v2c-5 2-9 7-9 13v5h30v-5c0-6-4-11-9-13v-2c2-2 4-5 4-9 0-6-4-11-10-11z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 56" className="h-[52px] w-10 shrink-0" fill="none" aria-hidden>
      <path
        d="M24 3c-7 0-12 6-12 13 0 5 2 8 5 10v1c-6 2-10 8-10 14v6h34v-6c0-6-4-12-10-14v-1c3-2 5-5 5-10 0-7-5-13-12-13z"
        fill="currentColor"
      />
      <path d="M12 20c4-3 8-4 12-4s8 1 12 4" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
    </svg>
  );
}

const palette = {
  male: {
    bg: "bg-slate-100",
    border: "border-slate-300",
    text: "text-slate-700",
    badge: "bg-slate-800",
  },
  female: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-800",
    badge: "bg-accent",
  },
} as const;

export function TeamShapeAvatar({
  name,
  gender,
  className,
}: {
  name: string;
  gender: Gender;
  className?: string;
}) {
  const colors = palette[gender];
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={cn("relative mx-auto h-[124px] w-[124px] shrink-0", className)}>
      <div
        className={cn(
          "absolute inset-0 border-2 team-shape-hexagon",
          colors.bg,
          colors.border,
        )}
      >
        <div
          className={cn(
            "h-full w-full flex flex-col items-center justify-center pt-2 pb-3",
            colors.text,
          )}
        >
          <PortraitIcon gender={gender} />
          <span className="font-mono text-[10px] font-bold tracking-widest leading-none mt-1">
            {initials}
          </span>
        </div>
      </div>

      <span
        className={cn(
          "absolute bottom-2 right-2 h-5 w-5 border-2 border-card z-10 team-shape-hexagon",
          colors.badge,
        )}
        aria-hidden
      />
    </div>
  );
}
