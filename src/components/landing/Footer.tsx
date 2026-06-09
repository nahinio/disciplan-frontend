import { Link } from "@tanstack/react-router";
import { ExternalLink, FileJson, Github } from "lucide-react";
import { DisciPlanLogo } from "@/components/DisciPlanLogo";
import { landingLinks } from "@/lib/landingConfig";

const footerNav = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Problem", href: "#problem" },
  { label: "Team", href: "#team" },
];

const resourceLinks = [
  {
    label: "API Docs",
    href: landingLinks.apiDocs,
    icon: ExternalLink,
    external: true,
  },
  {
    label: "OpenAPI JSON",
    href: landingLinks.openApi,
    icon: FileJson,
    external: true,
  },
  {
    label: "Frontend Repository",
    href: landingLinks.frontendRepo,
    icon: Github,
    external: true,
  },
  {
    label: "Backend Repository",
    href: landingLinks.backendRepo,
    icon: Github,
    external: true,
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/50">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-14 grid md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <Link to="/" className="flex items-center gap-2.5">
            <DisciPlanLogo />
            <span className="font-bold text-[17px] tracking-tight text-ink">DisciPlan</span>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground max-w-sm leading-relaxed">
            Discipline your data. Plan your success. An academic operating system for United International University.
          </p>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Team Quatro
          </p>
        </div>

        <div className="md:col-span-3">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">
            Navigate
          </div>
          <ul className="mt-4 space-y-2.5">
            {footerNav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-sm text-ink/70 hover:text-ink transition-colors">
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <Link to="/signup" className="text-sm text-ink/70 hover:text-ink transition-colors">
                Sign up
              </Link>
            </li>
          </ul>
        </div>

        <div className="md:col-span-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">
            Developer resources
          </div>
          <ul className="mt-4 space-y-2.5">
            {resourceLinks.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-ink/70 hover:text-accent transition-colors group"
                >
                  <item.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-8 py-6 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} DisciPlan · Team Quatro. All rights reserved.</span>
        <span className="font-mono tabular-nums">United International University</span>
      </div>
    </footer>
  );
}
