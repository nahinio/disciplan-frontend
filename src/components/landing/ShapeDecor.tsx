import { cn } from "@/lib/utils";

export function ShapeDecor({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div className="absolute -top-10 right-[12%] h-24 w-24 border-2 border-accent/20 rotate-12 landing-shape-solid-rose" />
      <div className="absolute top-40 left-[5%] h-16 w-16 border-2 border-ink/8 -rotate-6 landing-shape-solid-slate" />
      <div
        className="absolute top-24 right-[4%] h-20 w-20 border-2 border-accent/15 landing-wiggle"
        style={{ clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)" }}
      />
      <div className="absolute bottom-32 left-[8%] h-3 w-20 bg-accent/15 -rotate-3" />
      <div className="absolute bottom-48 right-[15%] h-12 w-12 border-2 border-ink/10 rotate-45" />
      <svg
        className="absolute top-28 left-1/2 -translate-x-1/2 text-border/50 w-full max-w-4xl"
        viewBox="0 0 900 120"
        fill="none"
      >
        <path
          d="M0 60 L120 60 M780 60 L900 60 M450 20 L450 100"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 8"
          className="landing-dash"
        />
      </svg>
      <div className="absolute top-16 left-[18%] h-2 w-2 bg-accent" />
      <div className="absolute top-32 right-[22%] h-2 w-2 bg-ink/20" />
      <div className="absolute bottom-40 left-[28%] h-2 w-2 bg-accent/60" />
    </div>
  );
}
