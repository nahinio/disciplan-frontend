import { createFileRoute } from "@tanstack/react-router";
import { appRouteSsr, requireAuth } from "@/lib/routeAuth";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { ForumWorkspace } from "@/components/forum/ForumWorkspace";

export const Route = createFileRoute("/forum/")({
  ssr: appRouteSsr,
  beforeLoad: () => {
    requireAuth();
  },
  head: () => ({
    meta: [
      { title: "DisciPlan — Forum" },
      { name: "description", content: "Share advice, resources, and discussions across your courses." },
    ],
  }),
  component: ForumPage,
});

function ForumPage() {
  return (
    <div className="min-h-screen bg-paper pb-20 md:pb-0">
      <TopHeader />
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <ForumWorkspace mode="global" />
      </main>
      <MobileTabBar />
    </div>
  );
}
