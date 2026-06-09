import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { redirectIfAuthenticated } from "@/lib/routeAuth";

const signupSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/signup")({
  validateSearch: (search) => signupSearchSchema.parse(search),
  beforeLoad: () => {
    redirectIfAuthenticated();
  },
  head: () => ({
    meta: [
      { title: "Create account — DisciPlan" },
      {
        name: "description",
        content: "Create your DisciPlan student or faculty account.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { redirect } = Route.useSearch();
  return <AuthFlow mode="signup" redirect={redirect} />;
}
