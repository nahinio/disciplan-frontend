import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserStats } from "@/hooks/useUserStats";

export function PendingFacultyScreen() {
  const { profile, logout, refreshProfile } = useUserStats();

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">
            Verification pending
          </h1>
          <p className="mt-3 text-sm text-slate-500 leading-relaxed">
            Hi {profile.name || "there"} — your faculty verification request for{" "}
            <span className="font-medium text-slate-700">{profile.email}</span> is awaiting
            administrator approval. You&apos;ll get full access to the faculty dashboard once approved.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => void refreshProfile()}>
            Check status
          </Button>
          <Button variant="ghost" onClick={logout} className="text-slate-500">
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
