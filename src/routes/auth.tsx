import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { redirectIfAuthenticated } from "@/lib/routeAuth";

const authSearchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
  redirect: z.string().optional(),
});

/** Legacy alias — redirects to /login or /signup */
export const Route = createFileRoute("/auth")({
  validateSearch: (search) => authSearchSchema.parse(search),
  beforeLoad: ({ search }) => {
    redirectIfAuthenticated();
    const target = search.mode === "signup" ? "/signup" : "/login";
    throw redirect({
      to: target,
      search: search.redirect ? { redirect: search.redirect } : undefined,
    });
  },
  component: () => null,
});
