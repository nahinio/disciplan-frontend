import { Reveal } from "./Reveal";
import { TeamShapeAvatar } from "./TeamShapeAvatar";

const team = [
  {
    name: "Masud Parves",
    id: "0112420507",
    role: "Team Lead",
    focus: "Lead Frontend Developer and Schema Design Specialist",
    gender: "male" as const,
  },
  {
    name: "Atika Hakim",
    id: "0112420456",
    role: "Frontend Developer",
    focus: "Frontend Developer and Strategist",
    gender: "female" as const,
  },
  {
    name: "Najib Hossain Nahin",
    id: "0112420504",
    role: "Backend Developer",
    focus: "Backend Developer (DevOps)",
    gender: "male" as const,
  },
  {
    name: "Sadia Akter Sumaia",
    id: "0112420448",
    role: "Research Lead",
    focus: "Query Design Specialist and Research",
    gender: "female" as const,
  },
];

export function Team() {
  return (
    <section id="team" className="relative py-20 md:py-28 border-t-2 border-border">
      <div className="pointer-events-none absolute top-12 right-[10%] h-20 w-20 border-2 border-accent/15 rotate-12" aria-hidden />
      <div
        className="pointer-events-none absolute bottom-20 left-[6%] h-14 w-14 border-2 border-ink/10"
        style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
        aria-hidden
      />

      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-[10px] uppercase tracking-[0.22em] text-accent font-semibold">
              The team
            </span>
            <h2 className="font-display text-3xl md:text-5xl tracking-tight font-semibold text-ink mt-3">
              Team Quatro
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Four UIU students building the academic platform we wished existed from day one of the degree.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {team.map((member, i) => (
            <Reveal key={member.id} delay={i * 0.08} className="h-full">
              <article className="group flex h-full min-h-[340px] flex-col border-2 border-border bg-card p-6 text-center transition-all duration-300 hover:border-ink/15 hover:shadow-[6px_6px_0_0_oklch(0.645_0.222_22/0.12)] hover:-translate-y-1">
                <div className="mb-5 flex justify-center">
                  <TeamShapeAvatar name={member.name} gender={member.gender} />
                </div>

                <h3 className="font-display text-lg font-semibold text-ink leading-snug min-h-[3.25rem] flex items-center justify-center px-1">
                  <span className="line-clamp-2">{member.name}</span>
                </h3>

                <p className="font-mono text-[11px] text-muted-foreground tabular-nums">{member.id}</p>

                <p className="text-xs font-semibold text-accent mt-3 uppercase tracking-wide min-h-[1rem]">
                  {member.role}
                </p>

                <p className="text-sm text-muted-foreground mt-3 leading-relaxed line-clamp-3 min-h-[4.5rem] flex-1">
                  {member.focus}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
