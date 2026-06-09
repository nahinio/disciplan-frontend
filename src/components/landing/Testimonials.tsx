import { Reveal } from "./Reveal";

const quotes = [
  {
    quote:
      "I stopped pulling all-nighters in week two. The blueprint just… knew when I'd burn out.",
    name: "Tahsin R.",
    school: "BUET, CSE '26",
  },
  {
    quote:
      "Felt like a chief of staff for my degree. Every CT now has a paced runway, not a panic.",
    name: "Anika S.",
    school: "NSU, BBA '25",
  },
  {
    quote:
      "The dependency nudges caught a clash my professor hadn't even announced yet.",
    name: "Mahir K.",
    school: "IUT, EEE '27",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <Reveal>
          <div className="max-w-2xl">
            <span className="text-[10px] uppercase tracking-[0.22em] text-rose-600 font-medium">
              Loved by serious students
            </span>
            <h2 className="font-display text-4xl md:text-5xl tracking-tighter font-semibold text-ink mt-3">
              Calm replaces cramming.
            </h2>
          </div>
        </Reveal>

        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {quotes.map((q, i) => (
            <Reveal key={q.name} delay={i * 0.08}>
              <figure className="h-full rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-xl p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.15)]">
                <blockquote className="text-ink text-[15px] leading-relaxed">
                  “{q.quote}”
                </blockquote>
                <figcaption className="mt-5 pt-5 border-t border-slate-200/70">
                  <div className="text-sm font-medium text-ink">{q.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{q.school}</div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
