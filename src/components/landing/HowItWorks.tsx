import { ArrowRight, CalendarPlus, ListChecks, Zap } from "lucide-react";
import { Reveal } from "./Reveal";

const steps = [
  {
    icon: CalendarPlus,
    step: "01",
    title: "Capture your semester",
    body: "Enroll in courses, add CTs and assignments, and create event plans. DisciPlan maps deadlines to daily targets automatically.",
    preview: ["CSE 3522 CT", "Event plan created", "14 days mapped"],
    tag: "Plan",
  },
  {
    icon: Zap,
    step: "02",
    title: "Set your energy",
    body: "Each morning, declare low, steady, or peak energy. The task queue reweights and reorders to match what you can handle today.",
    preview: ["Low", "Steady", "Peak"],
    tag: "Energy",
    activePreview: "Peak",
  },
  {
    icon: ListChecks,
    step: "03",
    title: "Execute with clarity",
    body: "Complete daily slices, join section discussions, submit work, and earn XP. Carryover keeps you honest without guilt spirals.",
    preview: ["3 tasks done", "+120 XP", "Rank up"],
    tag: "Execute",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative py-20 md:py-28 bg-paper border-y-2 border-border overflow-hidden">
      <div
        className="pointer-events-none absolute top-16 left-[5%] h-16 w-16 border-2 border-accent/15 -rotate-6"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-20 right-[8%] h-20 w-20 border-2 border-ink/8"
        style={{ clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)" }}
        aria-hidden
      />

      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-2xl">
              <span className="text-[10px] uppercase tracking-[0.22em] text-accent font-semibold">
                How it works
              </span>
              <h2 className="font-display text-3xl md:text-5xl tracking-tight font-semibold text-ink mt-3">
                Three steps from overwhelm to momentum
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed max-w-lg">
                Capture deadlines once, tune your queue to how you feel, then execute with daily slices and XP that
                actually rewards progress.
              </p>
            </div>
            <a
              href="#problem"
              className="inline-flex shrink-0 items-center gap-2 border-2 border-border bg-card px-5 py-2.5 text-sm font-semibold text-ink hover:border-ink/20 transition-colors"
            >
              Why DisciPlan
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </Reveal>

        <div className="mt-14 relative">
          <div
            className="hidden lg:block absolute top-[72px] left-[10%] right-[10%] border-t-2 border-dashed border-border"
            aria-hidden
          />

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.08} className="h-full">
                <article className="relative flex h-full min-h-[320px] flex-col border-2 border-border bg-card p-6 transition-all duration-300 hover:border-ink/15 hover:shadow-[6px_6px_0_0_oklch(0.645_0.222_22/0.1)] hover:-translate-y-0.5">
                  {i < steps.length - 1 && (
                    <div
                      className="hidden lg:grid absolute -right-3 top-[68px] z-10 h-6 w-6 place-items-center border-2 border-border bg-paper text-accent"
                      aria-hidden
                    >
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div className="grid place-items-center h-14 w-14 shrink-0 border-2 border-accent/25 bg-rose-50 text-accent">
                      <s.icon className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-[11px] font-bold tabular-nums border-2 border-border bg-muted/40 px-2.5 py-1 text-muted-foreground">
                      {s.step}
                    </span>
                  </div>

                  <span className="inline-block mt-5 text-[9px] font-bold uppercase tracking-wider bg-ink text-primary-foreground px-2 py-0.5 w-fit">
                    {s.tag}
                  </span>

                  <h3 className="font-display text-xl md:text-2xl font-semibold text-ink mt-3 tracking-tight leading-snug">
                    {s.title}
                  </h3>

                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed flex-1">{s.body}</p>

                  <div className="mt-5 pt-4 border-t-2 border-border/60">
                    {s.activePreview ? (
                      <div className="flex gap-1">
                        {s.preview.map((level) => (
                          <span
                            key={level}
                            className={`flex-1 text-center text-[9px] font-bold py-1.5 border-2 ${
                              level === s.activePreview
                                ? "bg-ink text-primary-foreground border-ink"
                                : "bg-card text-muted-foreground border-border"
                            }`}
                          >
                            {level}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {s.preview.map((item) => (
                          <div key={item} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="h-1.5 w-1.5 shrink-0 bg-accent" />
                            {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
