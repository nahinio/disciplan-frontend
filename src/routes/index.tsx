import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { GamificationStrip } from "@/components/landing/GamificationStrip";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ProblemSolution } from "@/components/landing/ProblemSolution";
import { Team } from "@/components/landing/Team";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DisciPlan | Discipline your data. Plan your success." },
      {
        name: "description",
        content:
          "DisciPlan is the academic operating system for UIU. Daily task queues, event plan slicing, section hubs, and gamification in one workspace.",
      },
      { property: "og:title", content: "DisciPlan | Discipline your data. Plan your success." },
      {
        property: "og:description",
        content:
          "Turn semester chaos into a calm daily plan. Planner, courses, sections, and community unified for United International University.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/image.png" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-paper text-ink antialiased overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <GamificationStrip />
        <Features />
        <HowItWorks />
        <ProblemSolution />
        <Team />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
