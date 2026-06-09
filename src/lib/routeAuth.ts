import { redirect } from "@tanstack/react-router";
import { isAuthenticated } from "./auth";
import { api } from "./api";

/** App routes use localStorage auth — client-only SSR avoids Vercel hydration crashes. */
export const appRouteSsr = false as const;

/** Redirect unauthenticated users to login (client-only). */
export function requireAuth() {
  if (typeof window === "undefined") return;
  if (!isAuthenticated()) {
    const redirectTo =
      window.location.pathname + window.location.search + window.location.hash;
    throw redirect({ to: "/login", search: { redirect: redirectTo } });
  }
}

/** Auth pages — send authenticated users to the dashboard. */
export function redirectIfAuthenticated() {
  if (typeof window === "undefined") return;
  if (isAuthenticated()) {
    throw redirect({ to: "/dashboard" });
  }
}

export function userIsPendingFaculty(me: Record<string, unknown>): boolean {
  return me.role_code === "faculty" && me.status_code === "pending";
}

function normalizeLegacyPath(path: string): string {
  if (path === "/app" || path.startsWith("/app?") || path.startsWith("/app/")) {
    return path.replace(/^\/app/, "/dashboard");
  }
  return path;
}

/** After login: dashboard (admin overview for admins). */
export async function resolvePostLoginPath(
  explicitRedirect?: string
): Promise<string> {
  if (
    explicitRedirect &&
    explicitRedirect.startsWith("/") &&
    !explicitRedirect.startsWith("//")
  ) {
    return normalizeLegacyPath(explicitRedirect);
  }
  try {
    const me = await api.getMe();
    if (me.role_code === "admin") return "/dashboard?view=overview";
    return "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export function isDashboardPath(dest: string): boolean {
  return (
    dest === "/app" ||
    dest === "/dashboard" ||
    dest.startsWith("/app?") ||
    dest.startsWith("/dashboard?")
  );
}
