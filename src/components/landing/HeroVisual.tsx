import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Flame, ListTodo, Trophy, Zap } from "lucide-react";
import { tierBadgeUrl } from "@/lib/tierBadges";

const veteranBadge = tierBadgeUrl("veteran");

function FloatCard({
  className,
  delay = 0,
  children,
}: {
  className?: string;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute z-20 ${className}`}
    >
      <div
        className="landing-float-card rounded-2xl border-2 border-border bg-card px-4 py-3 shadow-[4px_4px_0_0_oklch(0.21_0.034_264.5/0.08)]"
        style={{ animationDelay: `${delay}s` }}
      >
        {children}
      </div>
    </motion.div>
  );
}

function RingProgress({ value, label }: { value: number; label: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="flex items-center gap-3">
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="oklch(0.92 0.008 255)" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="oklch(0.645 0.222 22)"
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div>
        <p className="text-lg font-display font-semibold text-ink tabular-nums leading-none">{value}%</p>
        <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

export function HeroVisual() {
  return (
    <div className="relative mx-auto mt-14 md:mt-16 max-w-5xl h-[420px] sm:h-[480px] md:h-[520px]">
      {/* background shapes */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-8 left-[8%] h-14 w-14 border-2 border-accent/25 rotate-12 landing-shape-solid-rose" />
        <div className="absolute top-20 right-[6%] h-10 w-10 border-2 border-ink/10 rotate-45 landing-shape-solid-slate" />
        <div className="absolute bottom-16 left-[4%] h-8 w-24 border-2 border-accent/20 landing-shape-solid-rose" />
        <div className="absolute bottom-24 right-[10%] h-16 w-16 border-2 border-ink/10 -rotate-6" style={{ clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)" }} />
        <svg className="absolute top-1/2 left-0 w-16 h-16 text-border landing-wiggle" viewBox="0 0 64 64" fill="none">
          <path d="M8 32 L32 8 L56 32 L32 56 Z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <svg className="absolute bottom-8 right-0 w-20 h-20 text-accent/20 landing-wiggle-reverse" viewBox="0 0 80 80" fill="none">
          <rect x="12" y="12" width="56" height="56" rx="4" stroke="currentColor" strokeWidth="1.5" transform="rotate(15 40 40)" />
        </svg>
      </div>

      {/* floating stat cards */}
      <FloatCard className="top-0 left-0 md:left-[2%] max-w-[168px]" delay={0.35}>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <ListTodo className="w-3.5 h-3.5 text-ink" />
          Today&apos;s queue
        </div>
        <p className="font-display text-2xl font-semibold text-ink mt-1 tabular-nums">4 tasks</p>
        <div className="mt-2 space-y-1">
          {["CSE 3522 CT", "Lab report", "Forum reply"].map((t) => (
            <div key={t} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="h-1.5 w-1.5 bg-accent shrink-0" />
              {t}
            </div>
          ))}
        </div>
      </FloatCard>

      <FloatCard className="top-2 right-0 md:right-[2%] max-w-[156px]" delay={0.45}>
        <div className="flex items-center gap-2">
          {veteranBadge ? (
            <img src={veteranBadge} alt="" className="h-10 w-10 object-contain" />
          ) : (
            <div className="h-10 w-10 border-2 border-accent/30 bg-accent/10 grid place-items-center">
              <Trophy className="w-5 h-5 text-accent" />
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Tier up</p>
            <p className="font-display font-semibold text-ink">Veteran</p>
            <p className="text-xs text-accent font-semibold tabular-nums">+240 XP</p>
          </div>
        </div>
      </FloatCard>

      <FloatCard className="top-[38%] -left-2 md:left-0 max-w-[150px]" delay={0.5}>
        <RingProgress value={68} label="tasks done" />
      </FloatCard>

      <FloatCard className="top-[34%] -right-2 md:right-0 max-w-[140px]" delay={0.55}>
        <div className="flex items-center gap-2">
          <div className="grid place-items-center h-9 w-9 border-2 border-amber-500/30 bg-amber-500/10">
            <Flame className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="font-display text-xl font-semibold text-ink tabular-nums">7</p>
            <p className="text-[10px] text-muted-foreground">day streak</p>
          </div>
        </div>
      </FloatCard>

      <FloatCard className="bottom-8 left-[6%] max-w-[172px]" delay={0.6}>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Zap className="w-3.5 h-3.5 text-ink" />
          Energy filter
        </div>
        <div className="mt-2 flex gap-1">
          {["Low", "Steady", "Peak"].map((level) => (
            <span
              key={level}
              className={`flex-1 text-center text-[9px] font-semibold py-1 border ${
                level === "Peak"
                  ? "bg-ink text-primary-foreground border-ink"
                  : "bg-card text-muted-foreground border-border"
              }`}
            >
              {level}
            </span>
          ))}
        </div>
      </FloatCard>

      <FloatCard className="bottom-4 right-[4%] max-w-[160px]" delay={0.65}>
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent" />
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Leaderboard</p>
            <p className="font-display font-semibold text-ink">Rank #12</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-700">
          <CheckCircle2 className="w-3 h-3" />
          <span>2 badges this week</span>
        </div>
      </FloatCard>

      {/* central dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[46%] w-[88%] sm:w-[78%] md:w-[72%] z-10"
      >
        <div className="relative border-2 border-ink/10 bg-card shadow-[8px_8px_0_0_oklch(0.645_0.222_22/0.15)] overflow-hidden landing-float-slow">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b-2 border-border bg-muted/40">
            <span className="h-2.5 w-2.5 bg-accent" />
            <span className="h-2.5 w-2.5 bg-amber-400" />
            <span className="h-2.5 w-2.5 bg-emerald-500" />
            <span className="ml-2 text-[10px] font-mono text-muted-foreground">disciplan.app/dashboard</span>
          </div>
          <img
            src="/image.png"
            alt="DisciPlan dashboard with daily tasks and energy filter"
            className="w-full h-auto block"
            loading="eager"
          />
        </div>
        <div className="absolute -z-10 -bottom-3 -right-3 h-full w-full border-2 border-accent/20" aria-hidden />
      </motion.div>
    </div>
  );
}
