import { Reveal } from "./Reveal";
import { tierBadgeUrl } from "@/lib/tierBadges";
import { TIER_LADDER } from "@/lib/tiers";

const showcaseTiers = ["recruit", "contender", "specialist", "veteran", "champion", "titan"];

export function GamificationStrip() {
  return (
    <section className="py-12 md:py-14 border-b-2 border-border bg-card">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="max-w-md">
              <span className="text-[10px] uppercase tracking-[0.22em] text-accent font-semibold">
                Gamification ladder
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink mt-2 tracking-tight">
                Climb from Recruit to Titan
              </h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Complete tasks, help classmates, publish blogs, and keep streaks alive. Every action earns XP toward your
                next tier badge.
              </p>
            </div>

            <div className="flex flex-wrap items-end justify-center md:justify-end gap-3 md:gap-4">
              {showcaseTiers.map((code, i) => {
                const src = tierBadgeUrl(code);
                const label = TIER_LADDER.find((t) => t.code === code)?.label ?? code;
                return (
                  <div
                    key={code}
                    className="flex flex-col items-center gap-1.5"
                    style={{ transform: `translateY(${i % 2 === 0 ? 0 : 8}px)` }}
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={label}
                        className="h-12 w-12 md:h-14 md:w-14 object-contain drop-shadow-sm"
                      />
                    ) : (
                      <div className="h-12 w-12 border-2 border-border bg-muted/40" />
                    )}
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
