import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { redirectIfAuthenticated } from "@/lib/routeAuth";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: (search) => loginSearchSchema.parse(search),
  beforeLoad: () => {
    redirectIfAuthenticated();
  },
  head: () => ({
    meta: [
      { title: "Sign in — DisciPlan" },
      {
        name: "description",
        content: "Sign in to your DisciPlan account.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  return <AuthFlow mode="login" redirect={redirect} />;
}
