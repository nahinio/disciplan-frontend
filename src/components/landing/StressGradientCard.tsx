import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "hero" | "compact";
  initialProgress?: number;
  targetProgress?: number;
  course?: string;
  title?: string;
  deadline?: Date;
};

function useCountdown(deadline: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  let diff = Math.max(0, deadline.getTime() - now);
  const d = Math.floor(diff / 86_400_000);
  diff -= d * 86_400_000;
  const h = Math.floor(diff / 3_600_000);
  diff -= h * 3_600_000;
  const m = Math.floor(diff / 60_000);
  diff -= m * 60_000;
  const s = Math.floor(diff / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d)}d : ${pad(h)}h : ${pad(m)}m : ${pad(s)}s`;
}

const defaultDeadline = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(d.getHours() + 14, d.getMinutes() + 35, 12, 0);
  return d;
};

export function StressGradientCard({
  variant = "hero",
  initialProgress = 0.2,
  targetProgress = 0.8,
  course = "CSE 412",
  title = "Advanced DBMS Project",
  deadline,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const progress = useMotionValue(initialProgress);
  const heightPct = useTransform(progress, (v) => `${v * 100}%`);
  const bottomPct = useTransform(progress, (v) => `${v * 100}%`);
  const dl = deadline ?? defaultDeadline();
  const countdown = useCountdown(dl);

  useEffect(() => {
    const controls = animate(progress, targetProgress, {
      duration: 3,
      ease: [0.22, 1, 0.36, 1],
    });
    return controls.stop;
  }, [progress, targetProgress]);

  const isCompact = variant === "compact";

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className={cn(
        "relative rounded-3xl border border-white/70 bg-white/70 backdrop-blur-xl",
        "shadow-[0_30px_80px_-30px_rgba(15,23,42,0.18)] overflow-hidden",
        isCompact ? "aspect-[5/4]" : "aspect-[4/5] max-h-[520px]",
      )}
    >
      {/* ambient halo behind card */}
      <div className="pointer-events-none absolute -inset-10 -z-10 bg-[radial-gradient(60%_50%_at_50%_60%,rgba(244,63,94,0.18),transparent_70%)] blur-2xl" />

      {/* Layer 1: gradient fill */}
      <motion.div
        style={{ height: heightPct }}
        animate={{ opacity: hovered ? [0.95, 1, 0.95] : [0.85, 1, 0.85] }}
        transition={{
          duration: hovered ? 1.5 : 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-100 via-rose-100/40 to-rose-500/25 blur-3xl"
      />

      {/* Layer 1b: secondary glow */}
      <motion.div
        style={{ height: heightPct }}
        animate={{ opacity: hovered ? 0.9 : 0.6 }}
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-transparent via-rose-200/20 to-rose-400/30 blur-2xl"
      />

      {/* Layer 2: pressure line */}
      <motion.div
        style={{ bottom: bottomPct }}
        className="absolute inset-x-4 h-px bg-rose-500 blur-[3px] opacity-90"
      />
      <motion.div
        style={{ bottom: bottomPct }}
        className="absolute inset-x-12 h-px bg-rose-500/70"
      />

      {/* Content */}
      <div
        className={cn(
          "relative z-10 h-full flex flex-col justify-between",
          isCompact ? "p-5" : "p-7",
        )}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {course}
            </span>
            <h3
              className={cn(
                "font-display mt-1 tracking-tight text-ink",
                isCompact ? "text-lg" : "text-2xl",
              )}
            >
              {title}
            </h3>
          </div>
          <div className="rounded-full border border-slate-200/80 bg-white/70 backdrop-blur px-2.5 py-1 text-[10px] md:text-[11px] font-mono tabular-nums text-ink shadow-sm whitespace-nowrap">
            {countdown}
          </div>
        </header>

        {!isCompact && (
          <ul className="space-y-2.5">
            {[
              { label: "ER Diagram & Schema", done: true },
              { label: "Normalization (3NF)", done: false },
              { label: "Stored Procedures", done: false },
              { label: "Final Report", done: false },
            ].map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-3 text-sm text-ink/80"
              >
                <span
                  className={cn(
                    "grid place-items-center w-4 h-4 rounded-[5px] border",
                    item.done
                      ? "bg-ink border-ink text-paper"
                      : "border-slate-300 bg-white/60",
                  )}
                >
                  {item.done && <Check className="w-3 h-3" strokeWidth={3} />}
                </span>
                <span className={item.done ? "line-through text-muted-foreground" : ""}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        )}

        <footer className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Estimated effort · 4/5</span>
          <span className="text-rose-600 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Pressure rising
          </span>
        </footer>
      </div>
    </motion.div>
  );
}
