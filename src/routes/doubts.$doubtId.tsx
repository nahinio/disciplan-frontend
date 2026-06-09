import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/routeAuth";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { DoubtDetailView } from "@/components/doubts/DoubtDetailView";

export const Route = createFileRoute("/doubts/$doubtId")({
  beforeLoad: () => {
    requireAuth();
  },
  head: () => ({
    meta: [{ title: "DisciPlan — Doubt" }],
  }),
  component: DoubtDetailPage,
});

function DoubtDetailPage() {
  const { doubtId } = Route.useParams();
  const id = Number(doubtId);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-foreground">
      <TopHeader />
      <main className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-8">
          {Number.isFinite(id) && id > 0 ? (
            <DoubtDetailView doubtId={id} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Invalid doubt link.</p>
          )}
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}
