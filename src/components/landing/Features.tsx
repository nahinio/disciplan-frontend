import {
  CalendarRange,
  Flame,
  Gauge,
  GraduationCap,
  ListChecks,
  MessageSquare,
  Search,
  Trophy,
  Users,
} from "lucide-react";
import { Reveal } from "./Reveal";

const features = [
  {
    icon: ListChecks,
    title: "Daily task queue",
    body: "See exactly what is due today. Incomplete work stays visible. Overdue planner tasks roll forward with higher weight.",
    tag: "Task management",
  },
  {
    icon: Gauge,
    title: "Energy-aware sorting",
    body: "Pick low, steady, or peak energy. The queue reorders so you tackle the right difficulty at the right moment.",
    tag: "Task management",
  },
  {
    icon: CalendarRange,
    title: "Event plan slicing",
    body: "Big deadlines split into daily portions with carryover. Miss a day and progress rolls forward, not away.",
    tag: "Task management",
  },
  {
    icon: Trophy,
    title: "XP and tier ranks",
    body: "Ten tiers from Recruit to Titan. Earn points for tasks, helpful answers, blogs, and streaks with abuse caps.",
    tag: "Gamification",
  },
  {
    icon: Flame,
    title: "Streaks and badges",
    body: "Keep momentum with daily streaks and collectible badges. The leaderboard shows who contributes most.",
    tag: "Gamification",
  },
  {
    icon: GraduationCap,
    title: "Section hub",
    body: "Announcements, doubts, resources, exams, gradebook, and teams live in one place per section.",
    tag: "Academic",
  },
  {
    icon: Search,
    title: "Fuzzy doubt search",
    body: "Search across enrolled sections with full-text matching on titles, bodies, answers, and course codes.",
    tag: "Academic",
  },
  {
    icon: MessageSquare,
    title: "Forum and blogs",
    body: "Peer learning with threaded discussions, course blogs, voting, and faculty verification.",
    tag: "Community",
  },
  {
    icon: Users,
    title: "Project teams",
    body: "Faculty-assigned groups with shared tasks, chat, and course context built in.",
    tag: "Community",
  },
];

const tagColors: Record<string, string> = {
  "Task management": "bg-ink text-primary-foreground",
  Gamification: "bg-accent text-accent-foreground",
  Academic: "bg-slate-200 text-slate-800",
  Community: "bg-rose-100 text-rose-900",
};

export function Features() {
  return (
    <section id="features" className="relative py-20 md:py-28 bg-muted/30 border-y-2 border-border">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-2xl">
              <span className="text-[10px] uppercase tracking-[0.22em] text-accent font-semibold">
                Platform features
              </span>
              <h2 className="font-display text-3xl md:text-5xl tracking-tight font-semibold text-ink mt-3">
                Task control and gamification at the center
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                DisciPlan is built around what students do every day: finish tasks, stay on streaks, and climb the ranks
                while keeping the whole semester organized.
              </p>
            </div>
            <a
              href="#how"
              className="inline-flex shrink-0 items-center border-2 border-ink bg-card px-5 py-2.5 text-sm font-semibold text-ink hover:bg-muted/50 transition-colors"
            >
              How it works
            </a>
          </div>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {features.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 0.04}>
              <article className="group relative h-full border-2 border-border bg-card p-6 transition-all duration-300 hover:border-ink/15 hover:shadow-[5px_5px_0_0_oklch(0.21_0.034_264.5/0.06)] hover:-translate-y-0.5">
                <span
                  className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 ${tagColors[feature.tag]}`}
                >
                  {feature.tag}
                </span>
                <div className="grid place-items-center w-11 h-11 mt-4 border-2 border-border bg-muted/40 text-ink group-hover:border-accent/30 group-hover:bg-accent/5 transition-colors">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink mt-5 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{feature.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
