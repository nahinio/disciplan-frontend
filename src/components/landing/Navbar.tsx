import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { DisciPlanLogo } from "@/components/DisciPlanLogo";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Problem", href: "#problem" },
  { label: "Team", href: "#team" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "backdrop-blur-md bg-paper/80 border-b border-border/60 shadow-sm shadow-ink/5"
          : "bg-transparent border-b border-transparent",
      )}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <DisciPlanLogo />
          <span className="font-bold text-[17px] tracking-tight text-ink">DisciPlan</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground hover:text-ink transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-ink transition-colors">
            Sign in
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center rounded-full bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-semibold px-4 py-2 shadow-md shadow-rose-soft/30 transition-all hover:-translate-y-px"
          >
            Get started
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden grid place-items-center w-9 h-9 rounded-md text-ink"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-paper border-b border-border/60 overflow-hidden"
          >
            <div className="px-5 py-4 flex flex-col gap-3">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="text-sm text-muted-foreground py-1"
                >
                  {l.label}
                </a>
              ))}
              <Link
                to="/login"
                className="text-sm text-muted-foreground py-1"
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="mt-2 inline-flex justify-center items-center rounded-full bg-accent text-accent-foreground text-sm font-semibold px-4 py-2.5 shadow-md shadow-rose-soft/30"
                onClick={() => setOpen(false)}
              >
                Get started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
