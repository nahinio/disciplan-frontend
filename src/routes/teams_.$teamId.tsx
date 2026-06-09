import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { appRouteSsr, requireAuth } from "@/lib/routeAuth";
import { useState, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  Plus,
  X,
  Crown,
  CheckSquare,
  Trash2,
  MoreHorizontal,
  Calendar,
  Megaphone,
  User,
  Clock,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Send,
} from "lucide-react";
import { z } from "zod";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshButton } from "@/components/ui/refresh-button";
import type { TeamTask } from "@/data/mockTeams";
import { useTeamDetail } from "@/hooks/useTeamDetail";
import { useTeamChat } from "@/hooks/useTeamChat";
import { useUserStats } from "@/hooks/useUserStats";
import { AppSelect } from "@/components/ui/app-select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const teamSearchSchema = z.object({
  tab: z.string().optional(),
});

export const Route = createFileRoute("/teams_/$teamId")({
  ssr: appRouteSsr,
  beforeLoad: () => {
    requireAuth();
  },
  validateSearch: (search) => teamSearchSchema.parse(search),
  loader: ({ params }) => {
    if (!params.teamId || !Number.isFinite(Number(params.teamId))) throw notFound();
    return { teamId: params.teamId };
  },
  head: () => ({
    meta: [{ title: "DisciPlan — Team details" }],
  }),
  component: TeamDetailPage,
});

function TeamDetailPage() {
  const { teamId } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const activeTab = search.tab || "tasks";
  const onTabChange = useCallback(
    (tab: string) => {
      navigate({
        to: "/teams/$teamId",
        params: { teamId },
        search: { tab },
        replace: true,
      });
    },
    [navigate, teamId]
  );
  const { profile } = useUserStats();
  const { messages: teamChatMessages, sendMessage: sendTeamChat, wsConnected } = useTeamChat(teamId);
  const [teamChatInput, setTeamChatInput] = useState("");
  const {
    team,
    loading,
    error,
    createTask,
    toggleTask,
    createDate,
    createAnnouncement,
    refresh: refreshTeam,
    isFetching: teamFetching,
  } = useTeamDetail(teamId);
  const currentUserEmail = profile.email;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isAnnModalOpen, setIsAnnModalOpen] = useState(false);
  
  // Form states for Tasks
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDueDate, setTaskDueDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [taskAssignedEmail, setTaskAssignedEmail] = useState("");
  const [taskToEdit, setTaskToEdit] = useState<TeamTask | null>(null);

  // Form states for Important Dates
  const [dateTitle, setDateTitle] = useState("");
  const [dateVal, setDateVal] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split("T")[0];
  });
  const [dateDesc, setDateDesc] = useState("");

  // Form states for Announcements
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");

  const tasksList = useMemo(() => team?.tasks || [], [team]);

  const importantDatesList = useMemo(() => {
    const dates = team?.importantDates || [];
    const nowTime = Date.now();
    return [...dates].sort((a, b) => {
      const daysA = Math.ceil((a.date.getTime() - nowTime) / (1000 * 60 * 60 * 24));
      const daysB = Math.ceil((b.date.getTime() - nowTime) / (1000 * 60 * 60 * 24));
      
      const isPastA = daysA < 0;
      const isPastB = daysB < 0;
      
      if (isPastA !== isPastB) {
        return isPastA ? 1 : -1; // Upcoming first, past second
      }
      
      if (!isPastA) {
        return daysA - daysB; // Upcoming: closest first (ascending)
      } else {
        return daysB - daysA; // Past: most recent first (descending)
      }
    });
  }, [team]);

  const announcementsList = useMemo(() => {
    return (team?.announcements || []).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }, [team]);

  const acceptedMembers = useMemo(() => {
    return (team?.members ?? []).filter((m) => m.status === "accepted");
  }, [team]);

  const isLeader = team?.leaderEmail === currentUserEmail;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-sm text-slate-500">
        Loading team…
      </div>
    );
  }

  if (error || !team) {
    throw notFound();
  }

  // Task remaining time display calculation helper
  const getTimeRemaining = (dueDate: Date) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfDue = new Date(dueDate);
    startOfDue.setHours(0, 0, 0, 0);

    const diff = startOfDue.getTime() - startOfToday.getTime();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));

    if (days < 0) {
      return { text: `Overdue by ${Math.abs(days)}d`, isOverdue: true };
    }
    if (days === 0) {
      return { text: "Due today", isOverdue: false, isToday: true };
    }
    return { text: `${days}d remaining`, isOverdue: false };
  };

  // Submit Handlers
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await createTask(
        taskTitle.trim(),
        taskDesc.trim() || undefined,
        taskAssignedEmail || undefined,
        new Date(taskDueDate)
      );
      setTaskTitle("");
      setTaskDesc("");
      setTaskAssignedEmail("");
      setIsTaskModalOpen(false);
      toast.success("Project task created and synchronized!");
    } catch {
      toast.error("Failed to create task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditTask = (task: TeamTask) => {
    setTaskToEdit(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || "");
    setTaskDueDate(new Date(task.dueDate).toISOString().split("T")[0]);
    setTaskAssignedEmail(task.assignedToEmail || "");
    setIsEditTaskModalOpen(true);
  };

  const handleEditTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.error("Task editing is not available via API yet.");
    setIsEditTaskModalOpen(false);
  };

  const handleDeleteTaskClick = () => {
    toast.error("Task deletion is not available via API yet.");
  };

  const handleToggleTaskStatus = async (taskId: string, completed: boolean) => {
    try {
      await toggleTask(taskId, completed);
    } catch {
      toast.error("Failed to update task.");
    }
  };

  const handleQuickAssign = () => {
    toast.error("Reassigning tasks is not available via API yet.");
  };

  const handleCreateDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await createDate(dateTitle.trim(), new Date(dateVal));
      setDateTitle("");
      setDateDesc("");
      setIsDateModalOpen(false);
      toast.success("Important date added!");
    } catch {
      toast.error("Failed to add date.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    setIsSubmitting(true);
    try {
      await createAnnouncement(annTitle.trim(), annContent.trim());
      setAnnTitle("");
      setAnnContent("");
      setIsAnnModalOpen(false);
      toast.success("Team announcement posted!");
    } catch {
      toast.error("Failed to post announcement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-foreground">
      <TopHeader />
      <div className="flex-1 flex min-h-0">
        <main className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
          <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 space-y-6">
            
            {/* Header info bar */}
            <div>
              <Link
                to="/teams"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Teams
              </Link>
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <span className="font-mono text-xs font-bold text-[#7d9b76]">{team.courseCode}</span>
                <span className="text-xs text-slate-400 font-semibold">{team.courseTitle}</span>
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight mt-1 text-slate-800">
                Team {team.teamName}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Leader: {team.leaderName} {isLeader && "(You)"}
              </p>
            </div>

            {/* Radix Tabs Area */}
            <div className="mt-8">
              <div className="flex justify-end mb-3">
                <RefreshButton onClick={refreshTeam} loading={teamFetching} />
              </div>
              <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-5">
                <TabsList className="inline-flex h-9 items-center justify-start rounded-lg border border-[#dce5d4] p-0.5 bg-[#faf8f3] w-auto shadow-sm">
                  <TabsTrigger
                    value="tasks"
                    className="inline-flex items-center gap-1.5 px-3 py-1 h-7 rounded-md text-xs font-semibold transition data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Tasks List
                  </TabsTrigger>
                  <TabsTrigger
                    value="dates"
                    className="inline-flex items-center gap-1.5 px-3 py-1 h-7 rounded-md text-xs font-semibold transition data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Important Dates
                  </TabsTrigger>
                  <TabsTrigger
                    value="announcements"
                    className="inline-flex items-center gap-1.5 px-3 py-1 h-7 rounded-md text-xs font-semibold transition data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    Announcements
                  </TabsTrigger>
                  <TabsTrigger
                    value="chat"
                    className="inline-flex items-center gap-1.5 px-3 py-1 h-7 rounded-md text-xs font-semibold transition data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Team Chat
                  </TabsTrigger>
                </TabsList>

                {/* 1. TASKS TAB CONTENT */}
                <TabsContent value="tasks" className="mt-0 space-y-4 focus-visible:outline-none">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-display text-lg font-bold text-slate-800">
                      Team Milestones ({tasksList.length})
                    </h3>
                    
                    {isLeader && (
                      <button
                        onClick={() => {
                          setTaskTitle("");
                          setTaskDesc("");
                          setTaskAssignedEmail("");
                          setIsTaskModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7d9b76] hover:bg-[#6b8865] text-white text-[11px] font-bold shadow-sm transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Task
                      </button>
                    )}
                  </div>

                  {tasksList.length === 0 ? (
                    <div className="py-16 text-center rounded-2xl border border-dashed border-[#dce5d4] bg-white shadow-sm">
                      <CheckSquare className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                      <p className="text-sm text-slate-500 font-medium">No tasks created for this project yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tasksList.map((task) => {
                        const isCompleted = task.status === "completed";
                        const timeInfo = getTimeRemaining(task.dueDate);
                        const isTaskAssigned = !!task.assignedToEmail;

                        return (
                          <div
                            key={task.id}
                            className={cn(
                              "rounded-2xl border bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition",
                              isCompleted ? "border-slate-200 opacity-60 bg-slate-50/50" : "border-[#dce5d4]"
                            )}
                          >
                            {/* Left Side: Checkbox + Title & description */}
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <button
                                onClick={() => void handleToggleTaskStatus(task.id, task.status !== "completed")}
                                className={cn(
                                  "w-5 h-5 rounded-md border grid place-items-center cursor-pointer transition mt-0.5 shrink-0",
                                  isCompleted
                                    ? "bg-[#7d9b76] border-[#7d9b76] text-white"
                                    : "border-slate-300 hover:border-[#7d9b76] bg-white"
                                )}
                              >
                                {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-white fill-white" />}
                              </button>
                              <div className="min-w-0 space-y-1">
                                <h4
                                  className={cn(
                                    "text-sm font-bold leading-snug break-words",
                                    isCompleted ? "line-through text-slate-400" : "text-slate-800"
                                  )}
                                >
                                  {task.title}
                                </h4>
                                {task.description && (
                                  <p className="text-xs text-slate-500 leading-normal line-clamp-2 break-words">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Right Side: Metadata / Inline assign + time remaining + Options */}
                            <div className="flex items-center gap-4 justify-between md:justify-end shrink-0 flex-wrap">
                              {/* Assignee / Quick Assign Selector */}
                              <div className="text-left">
                                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                  Assignee
                                </span>
                                {isTaskAssigned ? (
                                  <span className="inline-flex items-center gap-1.5 mt-0.5 text-xs font-semibold text-slate-700">
                                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                                    {task.assignedToName}
                                  </span>
                                ) : (
                                  <div className="mt-0.5">
                                    <AppSelect
                                      size="xs"
                                      value=""
                                      onValueChange={() => handleQuickAssign()}
                                      placeholder="Assign Teammate"
                                      options={[
                                        {
                                          value: "",
                                          label: "Assign Teammate",
                                          disabled: true,
                                        },
                                        ...acceptedMembers.map((m) => ({
                                          value: m.email,
                                          label: m.name || m.email,
                                        })),
                                      ]}
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Time remaining badge */}
                              {!isCompleted && (
                                <div className="text-left">
                                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                    Due Date
                                  </span>
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 mt-0.5 text-xs font-bold font-mono px-2 py-0.5 rounded-full shrink-0 border",
                                      timeInfo.isOverdue
                                        ? "bg-rose-50 border-rose-200 text-rose-600"
                                        : timeInfo.isToday
                                          ? "bg-amber-50 border-amber-200 text-amber-600"
                                          : "bg-slate-50 border-slate-200 text-slate-500"
                                    )}
                                  >
                                    <Clock className="w-3 h-3 shrink-0" />
                                    {timeInfo.text}
                                  </span>
                                </div>
                              )}

                              {/* 3-Dot Options menu (only active members, edit/delete for leader) */}
                              <DropdownMenu>
                                <DropdownMenuTrigger className="h-8 w-8 grid place-items-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer focus:outline-none shrink-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem
                                    onClick={() => void handleToggleTaskStatus(task.id, task.status !== "completed")}
                                    className="text-xs font-semibold text-slate-700 focus:bg-slate-50 cursor-pointer"
                                  >
                                    {isCompleted ? "Mark Pending" : "Mark Completed"}
                                  </DropdownMenuItem>

                                  {isLeader && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => handleOpenEditTask(task)}
                                        className="text-xs font-semibold text-slate-700 focus:bg-slate-50 cursor-pointer"
                                      >
                                        <Edit3 className="w-4 h-4 mr-2 text-[#7d9b76] shrink-0" />
                                        Edit Task
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteTaskClick()}
                                        className="text-xs font-semibold text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2 shrink-0" />
                                        Delete
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* 2. IMPORTANT DATES TAB CONTENT */}
                <TabsContent value="dates" className="mt-0 space-y-4 focus-visible:outline-none">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-display text-lg font-bold text-slate-800">
                      Important Project Dates
                    </h3>
                    
                    {isLeader && (
                      <button
                        onClick={() => {
                          setDateTitle("");
                          setDateDesc("");
                          setIsDateModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7d9b76] hover:bg-[#6b8865] text-white text-[11px] font-bold shadow-sm transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Event
                      </button>
                    )}
                  </div>

                  {importantDatesList.length === 0 ? (
                    <div className="py-16 text-center rounded-2xl border border-dashed border-[#dce5d4] bg-white shadow-sm">
                      <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                      <p className="text-sm text-slate-500 font-medium">No important dates recorded yet.</p>
                    </div>
                  ) : (
                    <div className="relative pl-6 border-l-2 border-[#dce5d4]/60 space-y-6 py-2 ml-3">
                      {importantDatesList.map((dt) => {
                        const dateText = dt.date.toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        });
                        const daysLeft = Math.ceil((dt.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        const isPast = daysLeft < 0;

                        return (
                          <div key={dt.id} className="relative group">
                            {/* Dot on Timeline */}
                            <span className={cn(
                              "absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm shrink-0",
                              isPast ? "bg-slate-300" : "bg-emerald-500"
                            )} />
                            
                            {/* Info Block */}
                            <div className="space-y-1 max-w-xl">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className={cn(
                                  "text-xs font-bold font-mono",
                                  isPast ? "text-slate-400" : "text-slate-800"
                                )}>
                                  {dateText}
                                </span>
                                {!isPast && (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.25 rounded font-black uppercase tracking-wider shrink-0">
                                    {daysLeft === 0 ? "Today" : `${daysLeft}d left`}
                                  </span>
                                )}
                              </div>
                              <h4 className={cn(
                                "text-sm font-bold",
                                isPast ? "text-slate-400 line-through" : "text-slate-800"
                              )}>
                                {dt.title}
                              </h4>
                              {dt.description && (
                                <p className="text-xs text-slate-500 leading-relaxed">
                                  {dt.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* 3. ANNOUNCEMENTS TAB CONTENT */}
                <TabsContent value="announcements" className="mt-0 space-y-4 focus-visible:outline-none">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-display text-lg font-bold text-slate-800">
                      Team Announcements
                    </h3>
                    
                    {isLeader && (
                      <button
                        onClick={() => {
                          setAnnTitle("");
                          setAnnContent("");
                          setIsAnnModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7d9b76] hover:bg-[#6b8865] text-white text-[11px] font-bold shadow-sm transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Announcement
                      </button>
                    )}
                  </div>

                  {announcementsList.length === 0 ? (
                    <div className="py-16 text-center rounded-2xl border border-dashed border-[#dce5d4] bg-white shadow-sm">
                      <Megaphone className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                      <p className="text-sm text-slate-500 font-medium">No announcements made to this team yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {announcementsList.map((ann) => (
                        <div
                          key={ann.id}
                          className="rounded-2xl border border-[#dce5d4] bg-white p-5 shadow-sm space-y-3"
                        >
                          <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                              <span className="font-bold text-slate-700">{ann.authorName} (Leader)</span>
                            </div>
                            <span>{ann.createdAt.toLocaleDateString()}</span>
                          </div>
                          
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-slate-800 leading-tight">
                              {ann.title}
                            </h4>
                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                              {ann.content}
                            </p>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="chat" className="mt-0 focus-visible:outline-none">
                  <div className="rounded-2xl border border-[#dce5d4] bg-white shadow-sm flex flex-col h-[500px] overflow-hidden">
                    <header className="p-4 border-b border-slate-100 bg-[#faf8f3] flex items-center justify-between shrink-0">
                      <div>
                        <h3 className="font-display text-sm font-bold text-slate-800">Team project chat</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Collaborate with your teammates in real time.</p>
                      </div>
                      <span className={`text-[9px] uppercase tracking-widest font-black ${wsConnected ? "text-emerald-600" : "text-amber-600"}`}>
                        {wsConnected ? "Live" : "Syncing"}
                      </span>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#faf8f3]/25">
                      {teamChatMessages.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-10">No messages yet. Say hello to your team!</p>
                      ) : (
                        teamChatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={cn(
                              "max-w-[80%] rounded-2xl px-3 py-2 text-xs",
                              msg.author.name === profile.name
                                ? "ml-auto bg-[#7d9b76] text-white"
                                : "bg-white border border-[#dce5d4] text-slate-800"
                            )}
                          >
                            <p className="text-[9px] font-bold opacity-80 mb-0.5">{msg.author.name}</p>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <form
                      className="p-3 border-t border-slate-100 flex gap-2 shrink-0"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!teamChatInput.trim()) return;
                        try {
                          await sendTeamChat(teamChatInput.trim());
                          setTeamChatInput("");
                        } catch {
                          toast.error("Could not send message.");
                        }
                      }}
                    >
                      <input
                        value={teamChatInput}
                        onChange={(e) => setTeamChatInput(e.target.value)}
                        placeholder="Message your team…"
                        className="flex-1 h-9 px-3 rounded-xl border border-[#dce5d4] text-xs"
                      />
                      <button
                        type="submit"
                        className="h-9 w-9 rounded-xl bg-[#7d9b76] text-white grid place-items-center cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

          </div>
        </main>
      </div>

      {/* CREATE TASK MODAL */}
      <AnimatePresence>
        {isTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-[#dce5d4] p-6 shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <h3 className="font-display text-base font-bold text-slate-800">
                  Create Project Task
                </h3>
                <button
                  onClick={() => setIsTaskModalOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="py-4 space-y-4 overflow-y-auto no-scrollbar pr-1 flex-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Implement CRUD controls"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-[#faf8f3]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Description
                  </label>
                  <textarea
                    placeholder="Provide details about constraints or dependencies..."
                    rows={2.5}
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-[#faf8f3] resize-none animate-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-[#faf8f3]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Assign Member
                    </label>
                    <AppSelect
                      size="sm"
                      value={taskAssignedEmail}
                      onValueChange={setTaskAssignedEmail}
                      placeholder="Leave Unassigned"
                      options={[
                        { value: "", label: "Leave Unassigned" },
                        ...acceptedMembers.map((m) => ({
                          value: m.email,
                          label: m.name || m.email,
                        })),
                      ]}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className="px-4 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-full bg-[#7d9b76] text-white text-xs font-semibold hover:bg-[#6b8865] transition cursor-pointer"
                  >
                    Add Task
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT TASK MODAL */}
      <AnimatePresence>
        {isEditTaskModalOpen && taskToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-[#dce5d4] p-6 shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <h3 className="font-display text-base font-bold text-slate-800">
                  Edit Project Task
                </h3>
                <button
                  onClick={() => setIsEditTaskModalOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditTaskSubmit} className="py-4 space-y-4 overflow-y-auto no-scrollbar pr-1 flex-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Implement CRUD controls"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-[#faf8f3]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Description
                  </label>
                  <textarea
                    placeholder="Provide details about constraints or dependencies..."
                    rows={2.5}
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-[#faf8f3] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-[#faf8f3]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Assign Member
                    </label>
                    <AppSelect
                      size="sm"
                      value={taskAssignedEmail}
                      onValueChange={setTaskAssignedEmail}
                      placeholder="Unassigned"
                      options={[
                        { value: "", label: "Unassigned" },
                        ...acceptedMembers.map((m) => ({
                          value: m.email,
                          label: m.name || m.email,
                        })),
                      ]}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsEditTaskModalOpen(false)}
                    className="px-4 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-full bg-[#7d9b76] text-white text-xs font-semibold hover:bg-[#6b8865] transition cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE EVENT MODAL */}
      <AnimatePresence>
        {isDateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-[#dce5d4] p-6 shadow-2xl w-full max-w-sm flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <h3 className="font-display text-base font-bold text-slate-800">
                  Add Important Date
                </h3>
                <button
                  onClick={() => setIsDateModalOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateDate} className="py-4 space-y-4 flex-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Project Prototype Evaluation"
                    value={dateTitle}
                    onChange={(e) => setDateTitle(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-[#faf8f3]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dateVal}
                    onChange={(e) => setDateVal(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-[#faf8f3]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Description
                  </label>
                  <textarea
                    placeholder="Details about time, location or syllabus details..."
                    rows={2}
                    value={dateDesc}
                    onChange={(e) => setDateDesc(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-[#faf8f3] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsDateModalOpen(false)}
                    className="px-4 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-full bg-[#7d9b76] text-white text-xs font-semibold hover:bg-[#6b8865] transition cursor-pointer"
                  >
                    Create Event
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE ANNOUNCEMENT MODAL */}
      <AnimatePresence>
        {isAnnModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-[#dce5d4] p-6 shadow-2xl w-full max-w-md flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <h3 className="font-display text-base font-bold text-slate-800">
                  Post Team Announcement
                </h3>
                <button
                  onClick={() => setIsAnnModalOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAnnouncement} className="py-4 space-y-4 flex-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Announcement Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lab code instructions updated"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-[#faf8f3]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Message *
                  </label>
                  <textarea
                    required
                    placeholder="Write a message to your teammates..."
                    rows={4}
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-[#faf8f3] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAnnModalOpen(false)}
                    className="px-4 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-full bg-[#7d9b76] text-white text-xs font-semibold hover:bg-[#6b8865] transition cursor-pointer"
                  >
                    Post Bulletin
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MobileTabBar />
    </div>
  );
}
