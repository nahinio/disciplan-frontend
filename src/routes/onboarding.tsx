import { createFileRoute, redirect } from "@tanstack/react-router";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { isAuthenticated } from "@/lib/auth";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/signup" });
    }
  },
  head: () => ({
    meta: [
      { title: "Complete setup — DisciPlan" },
      {
        name: "description",
        content: "Finish your DisciPlan profile and weekly routine.",
      },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  return <OnboardingFlow />;
}
