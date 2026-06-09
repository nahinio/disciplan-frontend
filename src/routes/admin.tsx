import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAuthenticated } from "@/lib/auth";

/** Admin console lives on the dashboard — this path is a convenient entry point. */
export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && isAuthenticated()) {
      throw redirect({ to: "/dashboard", search: { view: "overview" } });
    }
    throw redirect({ to: "/login", search: { redirect: "/dashboard?view=overview" } });
  },
  component: () => null,
});
