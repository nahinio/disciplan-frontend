import { createFileRoute, Navigate } from "@tanstack/react-router";
import { requireAuth } from "@/lib/routeAuth";
import { useUserStats } from "@/hooks/useUserStats";

export const Route = createFileRoute("/profile/")({
  beforeLoad: () => {
    requireAuth();
  },
  component: ProfileRedirect,
});

function ProfileRedirect() {
  const { profile, profileReady } = useUserStats();
  if (!profileReady || !profile.id) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
        Loading profile…
      </div>
    );
  }
  return <Navigate to="/profile/$userId" params={{ userId: String(profile.id) }} replace />;
}
