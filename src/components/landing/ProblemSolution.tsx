import { Check, X } from "lucide-react";
import { Reveal } from "./Reveal";

const pairs = [
  {
    problem: "Deadlines stack up without a daily breakdown",
    solution: "Event plans split big deadlines into daily slices with carryover",
  },
  {
    problem: "Hard tasks land on low-energy days and cause burnout",
    solution: "Live task weighting matches queue order to your energy level",
  },
  {
    problem: "Planner apps, LMS, WhatsApp, and Drive never sync",
    solution: "One dashboard for planner, courses, sections, and community",
  },
  {
    problem: "Section updates scatter across channels",
    solution: "Section hub centralizes announcements, doubts, and grading",
  },
  {
    problem: "Academic tools feel like chores, so students disengage",
    solution: "Gamification rewards helpful answers, blogs, and consistency",
  },
];

export function ProblemSolution() {
  return (
    <section id="problem" className="relative py-20 md:py-28 bg-ink text-primary-foreground overflow-hidden">
      <div className="pointer-events-none absolute top-12 right-[6%] h-24 w-24 border-2 border-primary-foreground/10 rotate-12" aria-hidden />
      <div
        className="pointer-events-none absolute bottom-16 left-[4%] h-14 w-14 border-2 border-primary-foreground/10 landing-wiggle"
        style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
        aria-hidden
      />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 border-2 border-primary-foreground/5 rotate-45" aria-hidden />

      <div className="relative max-w-7xl mx-auto px-5 md:px-8">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-[10px] uppercase tracking-[0.22em] text-rose-soft font-semibold">
              Problem and solution
            </span>
            <h2 className="font-display text-3xl md:text-5xl tracking-tight font-semibold mt-3">
              Built for the semester crisis every student knows
            </h2>
            <p className="mt-4 text-primary-foreground/70 leading-relaxed">
              University work fragments across tools. DisciPlan brings structure back without adding another tab to
              forget.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid lg:grid-cols-2 gap-6 items-stretch">
          <Reveal delay={0.06} className="h-full">
            <div className="flex h-full min-h-[420px] flex-col border-2 border-primary-foreground/10 bg-primary-foreground/5 p-6 md:p-8">
              <div className="flex items-center gap-3 pb-5 border-b-2 border-primary-foreground/10">
                <div className="grid place-items-center h-11 w-11 border-2 border-red-400/40 bg-red-500/15 text-red-300">
                  <X className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-red-300 font-semibold">Before</p>
                  <h3 className="font-display text-xl font-semibold">The problem</h3>
                </div>
              </div>

              <ul className="mt-6 space-y-4 flex-1">
                {pairs.map((pair) => (
                  <li key={pair.problem} className="flex gap-3 text-sm text-primary-foreground/75 leading-relaxed">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center border-2 border-red-400/30 bg-red-500/10">
                      <span className="h-1.5 w-1.5 bg-red-400" />
                    </span>
                    {pair.problem}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.12} className="h-full">
            <div className="flex h-full min-h-[420px] flex-col border-2 border-accent/40 bg-accent/10 p-6 md:p-8 shadow-[8px_8px_0_0_oklch(0.645_0.222_22/0.25)]">
              <div className="flex items-center gap-3 pb-5 border-b-2 border-accent/25">
                <div className="grid place-items-center h-11 w-11 border-2 border-emerald-400/40 bg-emerald-500/15 text-emerald-300">
                  <Check className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-rose-soft font-semibold">After</p>
                  <h3 className="font-display text-xl font-semibold">The DisciPlan solution</h3>
                </div>
              </div>

              <ul className="mt-6 space-y-4 flex-1">
                {pairs.map((pair) => (
                  <li key={pair.solution} className="flex gap-3 text-sm text-primary-foreground/90 leading-relaxed">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center border-2 border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                    {pair.solution}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.18}>
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            {[
              { label: "Daily slices", value: "Carryover built in" },
              { label: "Energy queue", value: "Sorts by capacity" },
              { label: "XP ladder", value: "10 tiers to climb" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between border-2 border-primary-foreground/10 bg-primary-foreground/5 px-4 py-3 text-sm"
              >
                <span className="font-semibold">{item.label}</span>
                <span className="text-primary-foreground/60 text-xs">{item.value}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
