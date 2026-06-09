import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { ShapeDecor } from "./ShapeDecor";
import { HeroVisual } from "./HeroVisual";

export function Hero() {
  return (
    <section className="relative pt-28 md:pt-32 pb-10 md:pb-16 overflow-hidden">
      <ShapeDecor />

      <div className="relative max-w-7xl mx-auto px-5 md:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 border-2 border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground"
          >
            <span className="h-2 w-2 bg-accent" />
            Task management and gamification for UIU students
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="font-display mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-[3.5rem] tracking-tight font-semibold text-ink leading-[1.06]"
          >
            Plan your day.{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-accent">Earn your rank.</span>
              <span className="absolute left-0 right-0 -bottom-1 h-2.5 bg-rose-soft/60 -z-0 skew-x-[-8deg]" />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            DisciPlan turns deadlines into daily slices, sorts your queue by energy, and rewards real progress
            with XP, tiers, and leaderboard ranks. One workspace for tasks, courses, and your whole semester.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-ink hover:bg-ink/90 text-primary-foreground text-sm font-semibold px-6 py-3 border-2 border-ink shadow-[4px_4px_0_0_oklch(0.645_0.222_22)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              Start free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 border-2 border-border bg-card text-ink text-sm font-medium px-6 py-3 hover:border-ink/20 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              See features
            </a>
          </motion.div>
        </div>

        <HeroVisual />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="mt-12 md:mt-16 border-t-2 border-border pt-8"
        >
          <p className="text-center text-[10px] uppercase tracking-[0.24em] text-muted-foreground font-semibold mb-6">
            Built around how students actually work
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-3xl mx-auto text-center">
            {[
              { value: "10", label: "XP tiers", sub: "Recruit to Titan" },
              { value: "Live", label: "task weights", sub: "Energy matched queue" },
              { value: "Daily", label: "event slices", sub: "Carryover built in" },
              { value: "50+", label: "SQL tables", sub: "Raw query layer" },
            ].map((stat) => (
              <div key={stat.label} className="relative">
                <div className="font-display text-2xl md:text-3xl font-semibold text-ink tabular-nums">
                  {stat.value}
                </div>
                <div className="text-xs font-semibold text-ink mt-1">{stat.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
