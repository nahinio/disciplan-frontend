import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { useState } from "react";

export function WaitlistCTA() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-ink text-paper p-10 md:p-16">
          {/* glow */}
          <div className="pointer-events-none absolute -inset-20 bg-[radial-gradient(40%_50%_at_70%_80%,rgba(244,63,94,0.35),transparent_70%)] blur-2xl" />
          <div className="pointer-events-none absolute -inset-20 bg-[radial-gradient(30%_40%_at_20%_20%,rgba(244,63,94,0.18),transparent_70%)] blur-2xl" />

          <div className="relative max-w-2xl">
            <span className="text-[10px] uppercase tracking-[0.22em] text-rose-300 font-medium">
              Early access
            </span>
            <h2 className="font-display text-4xl md:text-5xl tracking-tighter font-semibold mt-3 leading-[1.05]">
              Trade panic for a plan.
            </h2>
            <p className="mt-4 text-paper/70 text-base md:text-lg max-w-xl">
              Join the waitlist. We're rolling out invites cohort by cohort,
              starting with universities.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!email) return;
                setSubmitted(true);
              }}
              className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl"
            >
              <AnimatePresence mode="wait">
                {!submitted ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col sm:flex-row gap-3"
                  >
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@university.edu"
                      className="flex-1 rounded-full bg-white/5 border border-white/15 px-5 py-3 text-sm text-paper placeholder:text-paper/40 outline-none transition-all focus:border-rose-500 focus:ring-4 focus:ring-rose-500/30 focus:bg-white/10"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium px-6 py-3 shadow-lg shadow-rose-900/40 transition-all hover:-translate-y-0.5"
                    >
                      Join waitlist
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-1 flex items-center gap-3 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-5 py-3 text-sm text-emerald-200"
                  >
                    <span className="grid place-items-center w-6 h-6 rounded-full bg-emerald-500 text-ink">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </span>
                    You're on the list. We'll be in touch soon.
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
