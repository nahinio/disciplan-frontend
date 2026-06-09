import { createFileRoute, Link } from "@tanstack/react-router";
import { appRouteSsr, requireAuth } from "@/lib/routeAuth";
import { useState, useMemo } from "react";
import { Search, X, Users, Crown, MoreHorizontal, LogOut, Pin } from "lucide-react";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import type { TeamListItem } from "@/hooks/useTeamsHub";
import { useTeamsHub } from "@/hooks/useTeamsHub";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import { useUserStats } from "@/hooks/useUserStats";
import { RefreshButton } from "@/components/ui/refresh-button";
import { usePageRefresh } from "@/hooks/usePageRefresh";

export const Route = createFileRoute("/teams")({
  ssr: appRouteSsr,
  beforeLoad: () => {
    requireAuth();
  },
  head: () => ({
    meta: [
      { title: "DisciPlan — Project Teams" },
      {
        name: "description",
        content: "Collaborate on course final projects, track members, and view active pending task lists.",
      },
    ],
  }),
  component: TeamsPage,
});

function TeamsPage() {
  const { profile } = useUserStats();
  const {
    teams: userTeams,
    invitations,
    loading,
    refresh,
    respondInvitation,
    leaveTeam,
    togglePin,
  } = useTeamsHub();
  const { refresh: refreshTeams, isRefreshing } = usePageRefresh(refresh);
  const currentUserEmail = profile.email;
  const [searchQuery, setSearchQuery] = useState("");

  if (profile.role === "faculty") {
    return (
      <div className="h-screen overflow-hidden flex flex-col bg-background text-foreground animate-in fade-in duration-300">
        <TopHeader />
        <div className="flex-1 flex min-h-0 items-center justify-center p-6 bg-slate-50/10">
          <div className="max-w-md w-full bg-white rounded-3xl border border-[#dce5d4] p-8 text-center space-y-6 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose mx-auto">
              <Users className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-850">
                Teams Page Restricted
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                The global Teams panel is only accessible to students. 
                As a faculty member, you can manage, overview, and grade project teams directly inside each course's **Section Hub Room**.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/courses"
                className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-rose text-white text-xs font-bold hover:bg-rose/90 transition shadow-sm cursor-pointer"
              >
                Go to My Courses
              </Link>
            </div>
          </div>
        </div>
        <MobileTabBar />
      </div>
    );
  }

  // Filtered teams list
  const filteredTeams = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return userTeams.filter(
      (t) =>
        t.teamName.toLowerCase().includes(q) ||
        t.courseCode.toLowerCase().includes(q) ||
        t.courseTitle.toLowerCase().includes(q) ||
        t.leaderName.toLowerCase().includes(q) ||
        t.members.some((m) => m.email.toLowerCase().includes(q) || (m.name && m.name.toLowerCase().includes(q)))
    );
  }, [userTeams, searchQuery]);

  const handleAcceptInvite = async (invitationId: string) => {
    try {
      await respondInvitation(invitationId, true);
      toast.success("Joined project team!");
    } catch {
      toast.error("Failed to accept invitation.");
    }
  };

  const handleDeclineInvite = async (invitationId: string) => {
    try {
      await respondInvitation(invitationId, false);
      toast.error("Declined team invitation.");
    } catch {
      toast.error("Failed to decline invitation.");
    }
  };

  const handleLeaveTeamClick = async (team: TeamListItem) => {
    try {
      await leaveTeam(team.id);
      toast.success(`You have left Team "${team.teamName}".`);
    } catch {
      toast.error("Failed to leave team.");
    }
  };

  const handleTogglePin = async (team: TeamListItem) => {
    try {
      await togglePin(team);
      toast.success(team.isPinned ? "Team unpinned" : "Team pinned to top");
    } catch {
      toast.error("Failed to update pin.");
    }
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-foreground">
      <TopHeader />
      <div className="flex-1 flex min-h-0">
        <main className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 space-y-6">
            
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-bold">
                  Collaboration Hub
                </p>
                <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mt-2 text-slate-800">
                  Project Teams
                </h1>
                <p className="text-muted-foreground mt-2 max-w-xl">
                  View project teams assigned by your instructor, respond to invitations, and collaborate with teammates.
                </p>
              </div>
              <RefreshButton onClick={refreshTeams} loading={isRefreshing || loading} className="shrink-0" />
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-4 border-y border-[#dce5d4]/40">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search team, course, leader, or member..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-9 rounded-full border border-[#dce5d4] bg-white text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-[#7d9b76] focus:ring-1 focus:ring-[#7d9b76] transition shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="text-xs text-muted-foreground font-semibold">
                Your Teams: <span className="text-slate-800 font-bold">{userTeams.length}</span>
              </div>
            </div>

            {invitations.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  Pending Invitations ({invitations.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {invitations.map((inv) => (
                    <div
                      key={inv.invitationId}
                      className="rounded-2xl border border-amber-200 bg-amber-50/30 p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-700 font-mono">
                            {inv.courseCode}
                          </span>
                          <h3 className="font-display text-lg font-bold text-slate-800 mt-1">
                            Team {inv.teamName}
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Invited by {inv.leaderName || inv.leaderEmail}
                          </p>
                        </div>
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={() => void handleDeclineInvite(inv.invitationId)}
                          className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-800 border border-slate-300 bg-white hover:bg-slate-50 rounded-full transition cursor-pointer"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => void handleAcceptInvite(inv.invitationId)}
                          className="px-3 py-1.5 text-[10px] font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-full transition cursor-pointer"
                        >
                          Join Team
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teams Cards Grid */}
            {loading ? (
              <div className="py-20 text-center text-sm text-slate-500">Loading teams…</div>
            ) : filteredTeams.length === 0 ? (
              <div className="py-20 text-center rounded-[1.25rem] border border-dashed border-[#dce5d4] bg-white shadow-sm">
                <Users className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500 font-medium">
                  No project teams yet. Your instructor will assign teams from the course section hub.
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-3 text-xs font-bold text-[#7d9b76] hover:text-[#6b8865] underline transition-colors cursor-pointer"
                  >
                    Clear search query
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredTeams.map((team) => {
                  const isLeader = team.leaderEmail === currentUserEmail;
                  const isPinned = Boolean(team.isPinned);
                  const memberCount = team.memberCount ?? team.members.length;

                  return (
                    <Link
                      key={team.id}
                      to="/teams/$teamId"
                      params={{ teamId: team.id }}
                      className={cn(
                        "rounded-2xl border bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition duration-300 overflow-hidden relative text-left cursor-pointer hover:border-[#7d9b76]/65",
                        isPinned ? "border-[#7d9b76] ring-1 ring-[#7d9b76]/30" : "border-[#dce5d4]"
                      )}
                    >
                      {/* Main card contents */}
                      <div className="p-6 space-y-4">
                        {/* Course and Team Metadata */}
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-700 font-mono">
                              {team.courseCode}
                            </span>
                            <h4 className="text-xs text-slate-400 mt-1 font-semibold leading-tight">
                              {team.courseTitle}
                            </h4>
                            <h3 className="font-display text-xl font-bold text-slate-800 tracking-tight mt-1">
                              Team {team.teamName}
                            </h3>
                          </div>

                          <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 grid place-items-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer focus:outline-none shrink-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  onClick={() => void handleTogglePin(team)}
                                  className="text-xs font-semibold text-slate-700 focus:bg-slate-50 cursor-pointer"
                                >
                                  <Pin className="w-4 h-4 mr-2 text-[#7d9b76] shrink-0" />
                                  {isPinned ? "Unpin Team" : "Pin Team"}
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem
                                  onClick={() => void handleLeaveTeamClick(team)}
                                  className="text-xs font-semibold text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer"
                                >
                                  <LogOut className="w-4 h-4 mr-2 shrink-0" />
                                  Leave Team
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Team Leader
                          </h4>
                          <div className="flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {team.leaderName || team.leaderEmail}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {memberCount} active member{memberCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      {/* Footer progress summary */}
                      <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold mt-auto shrink-0">
                        <span>{memberCount} member{memberCount === 1 ? "" : "s"}</span>
                        {isLeader && (
                          <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                            Your Team
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileTabBar />
    </div>
  );
}
