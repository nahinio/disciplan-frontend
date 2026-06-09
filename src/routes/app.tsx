import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const legacyAppSearchSchema = z.object({
  view: z.string().optional(),
});

/** Legacy alias — redirects to /dashboard */
export const Route = createFileRoute("/app")({
  validateSearch: (search) => legacyAppSearchSchema.parse(search),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/dashboard", search });
  },
  component: () => null,
});
