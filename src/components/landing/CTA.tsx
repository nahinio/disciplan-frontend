import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

export function CTA() {
  return (
    <section className="py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <Reveal>
          <div className="relative overflow-hidden border-2 border-border bg-card px-8 py-12 md:px-14 md:py-16 text-center">
            <div className="absolute -top-10 -right-10 h-32 w-32 border-2 border-accent/20 rotate-12" aria-hidden />
            <div
              className="absolute -bottom-8 -left-8 h-24 w-24 border-2 border-ink/10"
              style={{ clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)" }}
              aria-hidden
            />

            <h2 className="relative font-display text-3xl md:text-4xl font-semibold text-ink tracking-tight">
              Ready to plan your semester with clarity?
            </h2>
            <p className="relative mt-4 text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Join DisciPlan with your UIU email. Students, faculty, and admins each get a workspace built for their role.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-semibold px-6 py-3 border-2 border-accent shadow-[4px_4px_0_0_oklch(0.21_0.034_264.5/0.15)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                Create your account
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center border-2 border-border bg-card text-ink text-sm font-medium px-6 py-3 hover:border-ink/20 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
