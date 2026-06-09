import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Check, BookOpen, Bell, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { StressGradientCard } from "./StressGradientCard";
import { Reveal } from "./Reveal";

function CardShell({
  className,
  children,
  label,
  title,
}: {
  className?: string;
  children: React.ReactNode;
  label: string;
  title: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className={cn(
        "relative rounded-3xl border border-slate-200/60 bg-white/60 backdrop-blur-xl p-6 overflow-hidden",
        "shadow-[0_20px_60px_-30px_rgba(15,23,42,0.15)]",
        className,
      )}
    >
      <div className="flex flex-col h-full">
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </span>
        <h3 className="font-display text-xl tracking-tight text-ink mt-1">{title}</h3>
        <div className="mt-5 flex-1">{children}</div>
      </div>
    </motion.div>
  );
}

function CognitiveLoadChart() {
  return (
    <div className="relative h-44 w-full">
      <div className="absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_60%,rgba(244,63,94,0.18),transparent_70%)] blur-2xl" />
      <svg viewBox="0 0 400 160" className="relative w-full h-full">
        <defs>
          <linearGradient id="rose-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="slate-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0,110 C60,80 100,60 160,70 C220,80 270,40 330,55 C360,62 380,70 400,72 L400,160 L0,160 Z"
          fill="url(#slate-fill)"
        />
        <path
          d="M0,110 C60,80 100,60 160,70 C220,80 270,40 330,55 C360,62 380,70 400,72"
          fill="none"
          stroke="#0f172a"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        <path
          d="M0,130 C60,120 100,90 160,100 C220,108 270,80 330,90 C360,95 380,100 400,98 L400,160 L0,160 Z"
          fill="url(#rose-fill)"
        />
        <path
          d="M0,130 C60,120 100,90 160,100 C220,108 270,80 330,90 C360,95 380,100 400,98"
          fill="none"
          stroke="#f43f5e"
          strokeWidth="1.75"
        />
      </svg>
      <div className="absolute bottom-1 left-0 right-0 flex justify-between text-[10px] text-muted-foreground px-1">
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
      </div>
      <div className="absolute top-1 left-1 flex items-center gap-3 text-[10px]">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          Energy
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-ink" />
          Difficulty
        </span>
      </div>
    </div>
  );
}

function DailyBlueprint() {
  const [done, setDone] = useState<boolean[]>([true, false, false]);
  const completion = done.filter(Boolean).length / done.length;
  const allDone = completion === 1;

  return (
    <div className="relative h-full">
      <motion.div
        animate={{
          background: allDone
            ? "linear-gradient(180deg, rgba(16,185,129,0.18), rgba(16,185,129,0))"
            : `linear-gradient(180deg, rgba(244,63,94,${0.05 + completion * 0.15}), rgba(244,63,94,0))`,
        }}
        transition={{ duration: 0.6 }}
        className="absolute inset-0 -m-2 rounded-2xl blur-2xl"
      />
      <ul className="relative space-y-2.5">
        {[
          { time: "09:00", label: "Read DBMS chapter 4" },
          { time: "11:30", label: "Draft project outline" },
          { time: "15:00", label: "Solve 5 DSA problems" },
        ].map((t, i) => (
          <li
            key={t.label}
            className="flex items-center gap-3 text-sm text-ink/85"
          >
            <button
              onClick={() =>
                setDone((d) => d.map((v, idx) => (idx === i ? !v : v)))
              }
              className={cn(
                "grid place-items-center w-4 h-4 rounded-[5px] border transition-colors",
                done[i]
                  ? allDone
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "bg-ink border-ink text-white"
                  : "border-slate-300 bg-white/60 hover:border-ink",
              )}
            >
              <AnimatePresence>
                {done[i] && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {t.time}
            </span>
            <span className={done[i] ? "line-through text-muted-foreground" : ""}>
              {t.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResourceLibrary() {
  const topics = [
    "Recursion",
    "Dynamic Programming",
    "OS Scheduling",
    "Graph Algorithms",
    "Normalization",
    "TCP / IP",
    "Linear Algebra",
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {topics.map((t) => (
        <motion.span
          key={t}
          whileHover={{ y: -1 }}
          className="rounded-full border border-slate-200 bg-white/70 backdrop-blur px-2.5 py-1 text-xs text-ink/80 hover:border-rose-300 hover:text-rose-700 transition-colors cursor-default"
        >
          {t}
        </motion.span>
      ))}
    </div>
  );
}

function PeerReputation() {
  const badges = [
    { label: "Helper", count: 24 },
    { label: "Mentor", count: 11 },
    { label: "Architect", count: 3 },
  ];
  return (
    <div className="space-y-2">
      {badges.map((b) => (
        <div
          key={b.label}
          className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/60 backdrop-blur px-3 py-2"
        >
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-7 h-7 rounded-lg bg-rose-50 text-rose-600">
              <Trophy className="w-3.5 h-3.5" />
            </span>
            <span className="text-sm text-ink font-medium">{b.label}</span>
          </div>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            ×{b.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function NudgeCard() {
  return (
    <div className="space-y-2">
      <motion.div
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.4, repeat: Infinity }}
        className="flex items-start gap-3 rounded-xl border border-rose-200/70 bg-rose-50/50 backdrop-blur px-3 py-2.5"
      >
        <span className="mt-1 w-2 h-2 rounded-full bg-rose-500" />
        <div className="flex-1">
          <p className="text-xs font-medium text-ink">CSE 412 lab — 36h</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Schema diagram blocks 3 dependents.
          </p>
        </div>
      </motion.div>
      <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2.5">
        <Bell className="w-3.5 h-3.5 mt-0.5 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-xs font-medium text-ink">Energy dip predicted</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Move deep work to 9am tomorrow.
          </p>
        </div>
      </div>
    </div>
  );
}

export function IntelligenceHub() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <Reveal>
          <div className="max-w-2xl">
            <span className="text-[10px] uppercase tracking-[0.22em] text-rose-600 font-medium">
              The Intelligence Hub
            </span>
            <h2 className="font-display text-4xl md:text-5xl tracking-tighter font-semibold text-ink mt-3">
              Six systems, one strategist.
            </h2>
            <p className="text-muted-foreground mt-4 text-base md:text-lg">
              Every module quietly negotiates with the next — so your week
              re-plans itself the moment reality shifts.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5 auto-rows-[minmax(260px,auto)]">
          <Reveal className="md:col-span-2">
            <CardShell
              label="Module 01"
              title="Cognitive Load Balance"
              className="h-full"
            >
              <CognitiveLoadChart />
            </CardShell>
          </Reveal>
          <Reveal delay={0.05}>
            <CardShell label="Module 02" title="The Daily Blueprint" className="h-full">
              <DailyBlueprint />
            </CardShell>
          </Reveal>

          <Reveal>
            <CardShell label="Module 03" title="Pressure Forecast" className="h-full p-0">
              <div className="p-3">
                <StressGradientCard variant="compact" course="CSE 311" title="Algorithms CT 2" />
              </div>
            </CardShell>
          </Reveal>
          <Reveal delay={0.05}>
            <CardShell
              label="Module 04"
              title="Resource Library"
              className="h-full"
            >
              <div className="flex items-start gap-2">
                <BookOpen className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <ResourceLibrary />
              </div>
            </CardShell>
          </Reveal>
          <Reveal delay={0.1}>
            <CardShell
              label="Module 05"
              title="Peer Reputation"
              className="h-full"
            >
              <PeerReputation />
            </CardShell>
          </Reveal>

          <Reveal className="md:col-span-3">
            <CardShell
              label="Module 06"
              title="Dependency Nudges"
              className="h-full"
            >
              <NudgeCard />
            </CardShell>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
