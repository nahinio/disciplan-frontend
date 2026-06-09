import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Megaphone,
  HelpCircle,
  MessageSquare,
  Send,
  CheckCircle2,
  Plus,
  ShieldCheck,
  X,
  MoreHorizontal,
  Image as ImageIcon,
  Calendar,
  Clock,
  GraduationCap,
  Users,
  Award,
  Activity,
  FileText,
  Edit,
  Trash2,
  Crown,
  CheckSquare,
  AlertTriangle,
  BookOpen,
  Brain,
  ClipboardList,
  FolderOpen,
  Search,
  Flag
} from "lucide-react";
import { z } from "zod";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { decodeCourseCode, encodeCourseCode } from "@/lib/blog";
import { requireAuth } from "@/lib/routeAuth";
import { useOfferings } from "@/hooks/useOfferings";
import { useSectionHub } from "@/hooks/useSectionHub";
import { useSectionGrades } from "@/hooks/useSectionGrades";
import { useSectionChat } from "@/hooks/useSectionChat";
import { useSectionTeams } from "@/hooks/useSectionTeams";
import { api } from "@/lib/api";
import { getSubmissionTimingStatus } from "@/lib/submission";
import type { ExamAssignment, StudentSubmission } from "@/types/exam";
import { AppSelect } from "@/components/ui/app-select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { AnnouncementComments } from "@/components/section/AnnouncementComments";
import { SectionGradebookPanel } from "@/components/section/SectionGradebookPanel";
import { SectionResourcesTab } from "@/components/section/SectionResourcesTab";
import { RefreshButton } from "@/components/ui/refresh-button";
import { queryKeys } from "@/lib/queryKeys";
import { TaskWorkspace } from "@/components/tasks/TaskWorkspace";
import { ReportModal } from "@/components/blogs/ReportModal";
import { RoleBadge } from "@/components/blogs/RoleBadge";
import { useUserStats } from "@/hooks/useUserStats";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type {
  SectionDoubt,
  StudentGrades,
  ProjectGrade,
} from "@/data/mockSection";
import { type Team } from "@/data/mockTeams";

const sectionSearchSchema = z.object({
  section: z.string().optional(),
  tab: z.string().optional(),
  doubtId: z.string().optional(),
});

export const Route = createFileRoute("/courses_/$courseCode_/section")({
  beforeLoad: () => {
    requireAuth();
  },
  validateSearch: (search) => sectionSearchSchema.parse(search),
  loader: ({ params }) => {
    const code = decodeCourseCode(params.courseCode);
    return { code };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `DisciPlan â€” Section Hub â€” ${loaderData?.code ?? "Course"}` },
    ],
  }),
  component: CourseSectionPage,
});

export type { StudentSubmission, ExamAssignment } from "@/types/exam";

/** @deprecated Use useSectionHub / API â€” kept for submissions route compatibility */
export function getExams(): ExamAssignment[] {
  return [];
}

/** @deprecated */
export function saveExams(_exams: ExamAssignment[]) {}

/** @deprecated */
export function getExamsForSection(_courseCode: string, _section: string): ExamAssignment[] {
  return [];
}

/** @deprecated */
export function saveExamToDb(_exam: ExamAssignment) {}

export { getSubmissionTimingStatus };


function CourseSectionPage() {
  const { code } = Route.useLoaderData();
  const search = Route.useSearch();
  const activeTab = useMemo(() => {
    if (search.tab === "practice" || search.tab === "resources") return "section-resources";
    return search.tab || "announcements";
  }, [search.tab]);
  const section = search.section;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tabRefreshing, setTabRefreshing] = useState(false);
  const { offerings, loading: offeringsLoading, findOffering } = useOfferings();

  const offering = useMemo(() => {
    const found = findOffering(code, section);
    if (found) return found;
    return offerings.find((o) => o.course_code === code);
  }, [findOffering, code, section, offerings]);

  const sectionLabel = offering?.section ?? section ?? "";

  const onTabChange = useCallback(
    (tab: string) => {
      navigate({
        to: "/courses/$courseCode/section",
        params: { courseCode: encodeCourseCode(code) },
        search: {
          section: sectionLabel || section,
          tab,
          ...(search.doubtId ? { doubtId: search.doubtId } : {}),
        },
        replace: true,
      });
    },
    [navigate, code, sectionLabel, section, search.doubtId]
  );

  const { profile } = useUserStats();
  const hub = useSectionHub(code, sectionLabel);
  const {
    students,
    saveStudentGrades,
    saveProjectGrade,
    refresh: refreshGrades,
  } = useSectionGrades(code, sectionLabel);
  const isFacultyView = profile.role === "faculty" || profile.role === "admin";
  const { teams: sectionTeams, facultyAssignTeam, updateTeam, refresh: refreshTeams, gradeTeam } = useSectionTeams(
    code,
    sectionLabel,
    isFacultyView
  );
  const { messages: chatMessages, sendMessage: sendChatMessage, wsConnected } = useSectionChat(
    code,
    sectionLabel,
    offering?.faculty_name
  );

  const refreshActiveTab = useCallback(async () => {
    if (!sectionLabel) return;
    setTabRefreshing(true);
    try {
      switch (activeTab) {
        case "section-resources":
          await qc.refetchQueries({ queryKey: queryKeys.section.resources(code, sectionLabel) });
          await qc.refetchQueries({ queryKey: queryKeys.section.practice(code, sectionLabel) });
          break;
        case "project-teams":
          await refreshTeams();
          break;
        case "students":
          await refreshGrades();
          await hub.refresh();
          break;
        case "announcements":
        case "doubts":
        case "exams":
        case "chat":
        case "schedule":
        default:
          await hub.refresh();
          break;
      }
    } finally {
      setTabRefreshing(false);
    }
  }, [activeTab, code, sectionLabel, qc, hub, refreshGrades, refreshTeams]);

  const studentsInTeams = useMemo(() => {
    const emails = new Set<string>();
    sectionTeams.forEach((t) => {
      t.members.forEach((m) => emails.add(m.email));
    });
    return emails;
  }, [sectionTeams]);

  const unassignedStudents = useMemo(() => {
    return students.filter(s => !studentsInTeams.has(s.email));
  }, [students, studentsInTeams]);

  // Search/Filters
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  const filteredStudents = useMemo(() => {
    const q = studentSearchQuery.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      s => s.name.toLowerCase().includes(q) || s.id.includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [students, studentSearchQuery]);

  // Modal Dialog states
  const [editingStudent, setEditingStudent] = useState<StudentGrades | null>(null);
  const [gradingTarget, setGradingTarget] = useState<{
    type: "member" | "team";
    targetId: string; // studentId or teamId
    name: string; // student name or team name
    email?: string; // student email (for member type)
  } | null>(null);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);

  // Edit Team form states
  const [editingTeamTarget, setEditingTeamTarget] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamLeaderEmail, setEditTeamLeaderEmail] = useState("");
  const [editTeamMembersEmails, setEditTeamMembersEmails] = useState<string[]>([]);
  const [editSelectedUnassignedEmail, setEditSelectedUnassignedEmail] = useState("");

  const availableToEditAdd = useMemo(() => {
    if (!editingTeamTarget) return [];
    const currentTeamEmails = new Set(editTeamMembersEmails.map(e => e.trim().toLowerCase()));
    const originalTeamEmails = new Set(editingTeamTarget.members.map(m => m.email.trim().toLowerCase()));
    return students.filter(s => {
      const cleanEmail = s.email.trim().toLowerCase();
      if (currentTeamEmails.has(cleanEmail)) return false;
      const inAnyTeam = studentsInTeams.has(cleanEmail);
      const wasInOriginal = originalTeamEmails.has(cleanEmail);
      return !inAnyTeam || wasInOriginal;
    });
  }, [students, editTeamMembersEmails, editingTeamTarget, studentsInTeams]);

  // Forms states
  // 1. General student grades form
  const [editCtMarks, setEditCtMarks] = useState<string[]>(["", "", ""]);
  const [editMidMarks, setEditMidMarks] = useState("");
  const [editAttendance, setEditAttendance] = useState("");
  const [editStatus, setEditStatus] = useState<StudentGrades["overallStatus"]>("Steady");

  // 2. Project grade form
  const [gradeComponentName, setGradeComponentName] = useState("");
  const [gradeObtained, setGradeObtained] = useState("");
  const [gradeMax, setGradeMax] = useState("10");
  const [gradeFeedback, setGradeFeedback] = useState("");

  // Auto-populate project grade fields if a grade already exists for this component
  useEffect(() => {
    if (!gradingTarget) {
      return;
    }

    const compName = gradeComponentName.trim();
    if (!compName) {
      setGradeObtained("");
      setGradeMax("10");
      setGradeFeedback("");
      return;
    }

    const compNameLower = compName.toLowerCase();

    if (gradingTarget.type === "member") {
      const student = students.find(s => s.email.trim().toLowerCase() === gradingTarget.email?.trim().toLowerCase());
      const existing = student?.projectGrades?.find(
        g => g.componentName.toLowerCase() === compNameLower
      );
      if (existing) {
        setGradeObtained(existing.marksObtained.toString());
        setGradeMax(existing.maxMarks.toString());
        setGradeFeedback(existing.feedback || "");
      } else {
        setGradeObtained("");
        setGradeMax("10");
        setGradeFeedback("");
      }
    } else {
      // For team grading, lookup the first member's existing grade as a reference
      const team = sectionTeams.find(t => t.id === gradingTarget.targetId);
      if (team) {
        const firstMemberEmail = team.members.find(m => m.status === "accepted")?.email;
        if (firstMemberEmail) {
          const student = students.find(s => s.email.trim().toLowerCase() === firstMemberEmail.trim().toLowerCase());
          const existing = student?.projectGrades?.find(
            g => g.componentName.toLowerCase() === compNameLower
          );
          if (existing) {
            setGradeObtained(existing.marksObtained.toString());
            setGradeMax(existing.maxMarks.toString());
            setGradeFeedback(existing.feedback || "");
          } else {
            setGradeObtained("");
            setGradeMax("10");
            setGradeFeedback("");
          }
        }
      }
    }
  }, [gradeComponentName, gradingTarget, students, sectionTeams]);

  // 3. Manual team creation form
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLeaderEmail, setNewTeamLeaderEmail] = useState("");
  const [newTeamMembersEmails, setNewTeamMembersEmails] = useState<string[]>([]);

  // --- Exam & Assignment Portal States ---
  // Form states for creating an exam
  const [isCreateExamOpen, setIsCreateExamOpen] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState("");
  const [newExamDeadline, setNewExamDeadline] = useState("");
  const [newExamQuestions, setNewExamQuestions] = useState("");
  const [newExamAttachmentName, setNewExamAttachmentName] = useState("");
  const [newExamMaxMarks, setNewExamMaxMarks] = useState("20");

  // Form states for student submitting an assignment
  const [studentSubmissionFile, setStudentSubmissionFile] = useState<File | null>(null);

  // Key state variables to reset file inputs cleanly
  const [fileInputKey, setFileInputKey] = useState(0);
  const [studentSubInputKey, setStudentSubInputKey] = useState(0);

  // Edit Exam Modal States
  const [editingExamTarget, setEditingExamTarget] = useState<ExamAssignment | null>(null);
  const [editExamTitle, setEditExamTitle] = useState("");
  const [editExamDeadline, setEditExamDeadline] = useState("");
  const [editExamQuestions, setEditExamQuestions] = useState("");
  const [editExamAttachmentName, setEditExamAttachmentName] = useState("");
  const [editExamMaxMarks, setEditExamMaxMarks] = useState("20");
  const [editExamFileInputKey, setEditExamFileInputKey] = useState(0);

  const exams = hub.exams;

  const handleOpenEditExamModal = (exam: ExamAssignment) => {
    setEditingExamTarget(exam);
    setEditExamTitle(exam.title);
    setEditExamDeadline(exam.deadline || "");
    setEditExamQuestions(exam.questions || "");
    setEditExamAttachmentName(exam.attachmentName || "");
    setEditExamMaxMarks(exam.maxMarks.toString());
    setEditExamFileInputKey((k) => k + 1);
  };

  const handleEditExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExamTarget) return;
    const closes = editExamDeadline || editingExamTarget.deadline;
    try {
      await hub.updateExamPortal(Number(editingExamTarget.id), {
        title: editExamTitle.trim(),
        description: editExamQuestions.trim(),
        opens_at: new Date().toISOString(),
        closes_at: closes.length === 16 ? `${closes}:00` : closes,
        max_score: Math.max(1, parseFloat(editExamMaxMarks) || 20),
      });
      setEditingExamTarget(null);
      toast.success("Exam portal updated!");
    } catch {
      toast.error("Could not update exam portal");
    }
  };

  const handleDeleteExamClick = async (examId: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await hub.deleteExamPortal(Number(examId));
      toast.success("Exam portal deleted.");
    } catch {
      toast.error("Could not delete exam portal");
    }
  };

  const handleCreateExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle.trim() || !newExamMaxMarks.trim()) {
      toast.error("Exam title and max marks are required.");
      return;
    }

    const closes = newExamDeadline || new Date(Date.now() + 86400000).toISOString().slice(0, 16);
    const opens = new Date().toISOString();

    try {
      await hub.createExamPortal({
        title: newExamTitle.trim(),
        description: newExamQuestions.trim() || "No instructions provided.",
        opens_at: opens,
        closes_at: closes.length === 16 ? `${closes}:00` : closes,
        max_score: Math.max(1, parseFloat(newExamMaxMarks) || 20),
      });
      setNewExamTitle("");
      setNewExamDeadline("");
      setNewExamQuestions("");
      setNewExamAttachmentName("");
      setNewExamMaxMarks("20");
      setIsCreateExamOpen(false);
      setFileInputKey((k) => k + 1);
      toast.success(`Exam/Assignment "${newExamTitle.trim()}" created!`);
    } catch {
      toast.error("Could not create exam portal");
    }
  };

  const handleStudentSubmitAssignment = async (e: React.FormEvent, examId: string) => {
    e.preventDefault();
    if (!studentSubmissionFile) {
      toast.error("Please choose a file to upload.");
      return;
    }

    try {
      const uploaded = await api.uploadFile(studentSubmissionFile);
      await hub.submitExam(Number(examId), uploaded.file_id);
      setStudentSubmissionFile(null);
      setStudentSubInputKey((k) => k + 1);
      toast.success("Assignment submitted successfully!");
    } catch {
      toast.error("Could not submit assignment");
    }
  };


  // Handler functions:
  // Open student editor
  const handleOpenStudentEditor = (s: StudentGrades) => {
    setEditingStudent(s);
    setEditCtMarks(s.ctMarks.map(m => m.toString()));
    setEditMidMarks(s.midMarks.toString());
    setEditAttendance(s.attendance.toString());
    setEditStatus(s.overallStatus);
  };

  // Submit student grades edit
  const handleStudentGradesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    try {
      await saveStudentGrades(Number(editingStudent.id), {
        ctMarks: editCtMarks.map((m) => Math.max(0, parseFloat(m) || 0)),
        midMarks: Math.max(0, Math.min(30, parseFloat(editMidMarks) || 0)),
        attendance: Math.max(0, Math.min(100, parseInt(editAttendance) || 0)),
      });
      setEditingStudent(null);
      toast.success("Student details updated successfully!");
    } catch {
      toast.error("Could not save grades");
    }
  };

  // Submit project grade
  const handleProjectGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingTarget || !gradeComponentName.trim()) return;

    const maxM = Math.max(0, parseFloat(gradeMax) || 0);
    const obtM = Math.max(0, Math.min(maxM, parseFloat(gradeObtained) || 0));

    const newGrade: ProjectGrade = {
      componentName: gradeComponentName.trim(),
      marksObtained: obtM,
      maxMarks: maxM,
      feedback: gradeFeedback.trim() || undefined,
    };

    try {
      if (gradingTarget.type === "member") {
        const targetEmailClean = gradingTarget.email?.trim().toLowerCase();
        const student = students.find(
          (s) => s.email.trim().toLowerCase() === targetEmailClean
        );
        if (!student) return;
        await saveProjectGrade(
          Number(student.id),
          newGrade.componentName,
          newGrade.marksObtained,
          newGrade.maxMarks
        );
        toast.success(`Graded ${gradingTarget.name} for ${newGrade.componentName}!`);
      } else {
        await gradeTeam(
          Number(gradingTarget.targetId),
          obtM,
          maxM,
          newGrade.componentName
        );
        await refreshGrades();
        toast.success(`Graded entire Team "${gradingTarget.name}" for ${newGrade.componentName}!`);
      }

      setGradingTarget(null);
      setGradeComponentName("");
      setGradeObtained("");
      setGradeFeedback("");
    } catch {
      toast.error("Could not save project grade");
    }
  };

  // Submit manual team creation
  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamLeaderEmail) {
      toast.error("Team name and leader are required.");
      return;
    }

    const leaderStudent = students.find(
      (s) => s.email.trim().toLowerCase() === newTeamLeaderEmail.trim().toLowerCase()
    );
    if (!leaderStudent) return;

    const memberEmails = [
      ...newTeamMembersEmails.map((e) => e.trim()),
    ].filter((email, idx, arr) => arr.indexOf(email) === idx && email.toLowerCase() !== newTeamLeaderEmail.trim().toLowerCase());

    const memberIds = memberEmails
      .map((email) => students.find((s) => s.email.toLowerCase() === email.toLowerCase())?.id)
      .filter((id): id is string => Boolean(id))
      .map(Number);

    try {
      await facultyAssignTeam(newTeamName.trim(), Number(leaderStudent.id), memberIds);
      setNewTeamName("");
      setNewTeamLeaderEmail("");
      setNewTeamMembersEmails([]);
      setIsCreateTeamOpen(false);
      toast.success(`Team "${newTeamName.trim()}" created successfully!`);
    } catch {
      toast.error("Could not create team");
    }
  };

  const handleDeleteTeamClick = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to dissolve Team "${teamName}"?`)) return;
    try {
      await api.disbandTeam(Number(teamId));
      await refreshTeams();
      toast.success(`Team "${teamName}" dissolved.`);
    } catch {
      toast.error("Could not dissolve team");
    }
  };

  // Open Edit Team Modal
  const handleOpenEditTeamModal = (team: Team) => {
    setEditingTeamTarget(team);
    setEditTeamName(team.teamName);
    setEditTeamLeaderEmail(team.leaderEmail);
    setEditTeamMembersEmails(team.members.map(m => m.email));
    setEditSelectedUnassignedEmail("");
  };

  // Remove member in Edit Modal state
  const handleRemoveMemberFromEditState = (emailToRemove: string) => {
    if (emailToRemove.trim().toLowerCase() === editTeamLeaderEmail.trim().toLowerCase()) {
      toast.error("Cannot remove the leader. Change the team leader first.");
      return;
    }
    setEditTeamMembersEmails(prev => prev.filter(email => email.trim().toLowerCase() !== emailToRemove.trim().toLowerCase()));
  };

  // Add member in Edit Modal state
  const handleAddMemberToEditState = () => {
    if (!editSelectedUnassignedEmail) return;
    
    const cleanEmail = editSelectedUnassignedEmail.trim().toLowerCase();
    if (editTeamMembersEmails.some(e => e.trim().toLowerCase() === cleanEmail)) {
      toast.error("Student is already a member of this team.");
      return;
    }

    setEditTeamMembersEmails(prev => [...prev, editSelectedUnassignedEmail]);
    setEditSelectedUnassignedEmail("");
  };

  // Submit Edit Team changes
  const handleEditTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeamTarget) return;

    if (!editTeamName.trim()) {
      toast.error("Team name is required.");
      return;
    }

    if (!editTeamLeaderEmail) {
      toast.error("Team leader is required.");
      return;
    }

    const originalEmails = new Set(
      editingTeamTarget.members.map((m) => m.email.trim().toLowerCase())
    );
    const newEmails = editTeamMembersEmails.filter(
      (email) => !originalEmails.has(email.trim().toLowerCase())
    );

    const leaderStudent = students.find(
      (s) => s.email.trim().toLowerCase() === editTeamLeaderEmail.trim().toLowerCase()
    );
    const currentEmails = new Set(
      editTeamMembersEmails.map((e) => e.trim().toLowerCase())
    );
    const addIds = newEmails
      .map((email) =>
        students.find((s) => s.email.trim().toLowerCase() === email.trim().toLowerCase())
      )
      .filter(Boolean)
      .map((s) => Number(s!.id));
    const removeIds = editingTeamTarget.members
      .filter((m) => !currentEmails.has(m.email.trim().toLowerCase()))
      .map((m) =>
        students.find((s) => s.email.trim().toLowerCase() === m.email.trim().toLowerCase())
      )
      .filter(Boolean)
      .map((s) => Number(s!.id));

    try {
      await updateTeam(Number(editingTeamTarget.id), {
        name: editTeamName.trim(),
        leader_user_id: leaderStudent ? Number(leaderStudent.id) : undefined,
        add_member_user_ids: addIds.length ? addIds : undefined,
        remove_member_user_ids: removeIds.length ? removeIds : undefined,
      });
      await refreshTeams();
      setEditingTeamTarget(null);
      toast.success(`Team "${editTeamName.trim()}" updated successfully!`);
    } catch {
      toast.error("Could not update team");
    }
  };

  const hasTeamMgmt = Boolean(offering?.has_project);

  const announcements = hub.announcements;

  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);

  // Reset selected announcement if it no longer exists
  useEffect(() => {
    if (selectedAnnId && !announcements.some((a) => a.id === selectedAnnId)) {
      setSelectedAnnId(null);
    }
  }, [announcements, selectedAnnId]);

  const [isAnnComposerOpen, setIsAnnComposerOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annImages, setAnnImages] = useState<string[]>([]);
  const annFileInputRef = useRef<HTMLInputElement | null>(null);

  const doubts = hub.doubts;

  const [selectedDoubtId, setSelectedDoubtId] = useState<string | null>(search.doubtId || null);
  const [isDoubtReportOpen, setIsDoubtReportOpen] = useState(false);

  // Sync doubtId from search query parameters
  useEffect(() => {
    if (search.doubtId) {
      setSelectedDoubtId(search.doubtId);
    }
  }, [search.doubtId]);

  // Reset selected doubt if it no longer exists
  useEffect(() => {
    if (selectedDoubtId && !doubts.some((d) => d.id === selectedDoubtId)) {
      setSelectedDoubtId(null);
    }
  }, [doubts, selectedDoubtId]);

  const [selectedDoubtDetail, setSelectedDoubtDetail] = useState<SectionDoubt | null>(null);
  const [doubtAnswerText, setDoubtAnswerText] = useState("");

  useEffect(() => {
    if (!selectedDoubtId) {
      setSelectedDoubtDetail(null);
      return;
    }
    let cancelled = false;
    void hub.loadDoubtDetail(selectedDoubtId).then((d) => {
      if (!cancelled) setSelectedDoubtDetail(d);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedDoubtId, hub]);

  const [isDoubtComposerOpen, setIsDoubtComposerOpen] = useState(false);
  const [doubtQuestion, setDoubtQuestion] = useState("");
  const [doubtDesc, setDoubtDesc] = useState("");
  const [doubtImages, setDoubtImages] = useState<string[]>([]);
  const doubtFileInputRef = useRef<HTMLInputElement | null>(null);

  const [chatInputText, setChatInputText] = useState("");
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Handlers for image attachments
  const handleAnnImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setAnnImages((prev) => [...prev, reader.result]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleDoubtImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setDoubtImages((prev) => [...prev, reader.result]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeAnnImage = (idx: number) => {
    setAnnImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeDoubtImage = (idx: number) => {
    setDoubtImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit Handlers
  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;
    try {
      await hub.createAnnouncement(annTitle.trim(), annContent.trim());
      setAnnTitle("");
      setAnnContent("");
      setAnnImages([]);
      setIsAnnComposerOpen(false);
      toast.success("Announcement posted successfully!");
    } catch {
      toast.error("Could not post announcement");
    }
  };

  const handleDoubtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doubtQuestion.trim() || !doubtDesc.trim()) return;
    try {
      await hub.createDoubt(doubtQuestion.trim(), doubtDesc.trim());
      setDoubtQuestion("");
      setDoubtDesc("");
      setDoubtImages([]);
      setIsDoubtComposerOpen(false);
      toast.success("Your doubt has been posted!");
    } catch {
      toast.error("Could not post doubt");
    }
  };

  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;

    try {
      await sendChatMessage(chatInputText.trim());
      setChatInputText("");
    } catch {
      toast.error("Could not send message");
    }
  };

  const getAnswerCount = (doubtId: string) => {
    const d = hub.doubts.find((x) => x.id === doubtId);
    if (d?.answerCount != null) return d.answerCount;
    if (selectedDoubtDetail?.id === doubtId) return selectedDoubtDetail.answers?.length ?? 0;
    return 0;
  };

  const handleDoubtAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoubtId || !doubtAnswerText.trim()) return;
    try {
      await hub.answerDoubt(Number(selectedDoubtId), doubtAnswerText.trim());
      setDoubtAnswerText("");
      const detail = await hub.loadDoubtDetail(selectedDoubtId);
      setSelectedDoubtDetail(detail);
      await hub.refresh({ silent: true });
      toast.success(isFacultyView ? "Verified answer published!" : "Answer posted!");
    } catch {
      toast.error("Could not post answer");
    }
  };

  const handleSectionMarkSolved = async () => {
    if (!selectedDoubtId) return;
    try {
      await api.verifyDoubt(Number(selectedDoubtId));
      const detail = await hub.loadDoubtDetail(selectedDoubtId);
      setSelectedDoubtDetail(detail);
      await hub.refresh({ silent: true });
      toast.success("Doubt marked as solved.");
    } catch {
      toast.error("Could not mark doubt as solved");
    }
  };

  const handleSectionVerifyAnswer = async (answerId: string) => {
    try {
      await api.acceptDoubtAnswer(Number(answerId));
      if (selectedDoubtId) {
        const detail = await hub.loadDoubtDetail(selectedDoubtId);
        setSelectedDoubtDetail(detail);
      }
      await hub.refresh({ silent: true });
      toast.success("Student answer verified.");
    } catch {
      toast.error("Could not accept answer as official solution");
    }
  };

  if (!offeringsLoading && !offering) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-slate-500">Section not found. Enroll via onboarding or settings.</p>
      </div>
    );
  }

  if (!offering) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading section…</p>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-foreground">
      <TopHeader />
      <main className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {isFacultyView ? (
                <Link
                  to="/courses"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Courses
                </Link>
              ) : (
                <Link
                  to="/courses/$courseCode"
                  params={{ courseCode: encodeCourseCode(offering.course_code) }}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Course
                </Link>
              )}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <span className="font-mono text-xs font-bold text-[#7d9b76]">{code}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-900 text-white uppercase tracking-wider">
                  Section {offering.section}
                </span>
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight mt-1 text-slate-800">
                Section Hub Room
              </h1>
              <p className="text-xs text-slate-500 mt-1">Instructor: {offering.faculty_name} ({offering.faculty_initial})</p>
            </div>
            <RefreshButton onClick={refreshActiveTab} loading={tabRefreshing} />
          </div>

          {/* Tabs Container */}
          <div className="mt-8">
            <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-5">
              <TabsList className="inline-flex h-9 items-center justify-start rounded-lg border border-[#dce5d4] p-0.5 bg-[#faf8f3] w-auto flex-wrap">
                <TabsTrigger
                  value="announcements"
                  className="inline-flex items-center gap-1.5 px-3 py-1 h-7 rounded-md text-xs font-semibold transition data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  Announcements
                </TabsTrigger>
                <TabsTrigger
                  value="doubts"
                  className="inline-flex items-center gap-1.5 px-3 py-1 h-7 rounded-md text-xs font-semibold transition data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  {isFacultyView ? "Student Doubts" : "Ask Question"}
                </TabsTrigger>
                <TabsTrigger
                  value="chat"
                  className="inline-flex items-center gap-1.5 px-3 py-1 h-7 rounded-md text-xs font-semibold transition data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat Room
                </TabsTrigger>
                <TabsTrigger
                  value="section-resources"
                  className="inline-flex items-center gap-1.5 px-3 py-1 h-7 rounded-md text-xs font-semibold transition data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Section Resources
                </TabsTrigger>
                {!isFacultyView && (
                  <TabsTrigger
                    value="exams"
                    className="inline-flex items-center gap-1.5 px-3 py-1 h-7 rounded-md text-xs font-semibold transition data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Exams & Assignments
                  </TabsTrigger>
                )}
                {isFacultyView && (
                  <>
                    <TabsTrigger
                      value="schedule"
                      className="inline-flex items-center gap-1.5 px-3 py-1 h-7 rounded-md text-xs font-semibold transition data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Tasks & Schedule
                    </TabsTrigger>
                    {hasTeamMgmt && (
                      <TabsTrigger
                        value="project-teams"
                        className="inline-flex items-center gap-1.5 px-3 py-1 h-7 rounded-md text-xs font-semibold transition data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Project Teams
                      </TabsTrigger>
                    )}
                    <TabsTrigger
                      value="students"
                      className="inline-flex items-center gap-1.5 px-3 py-1 h-7 rounded-md text-xs font-semibold transition data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      Gradebook
                    </TabsTrigger>
                  </>
                )}
              </TabsList>

              {/* 1. ANNOUNCEMENTS TAB */}
              <TabsContent value="announcements" className="mt-0 focus-visible:outline-none">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Announcements List */}
                  <div className={cn("space-y-4", selectedAnnId ? "lg:col-span-5" : "lg:col-span-12")}>
                    {/* Faculty composer */}
                    {isFacultyView && (
                      <div className="rounded-2xl border border-[#dce5d4] bg-[#faf8f3] p-4 shadow-sm">
                        <button
                          onClick={() => setIsAnnComposerOpen((prev) => !prev)}
                          className="flex items-center justify-between w-full font-display text-sm font-semibold text-slate-800 cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Plus className="w-4 h-4 text-[#7d9b76]" />
                            Create New Announcement
                          </span>
                          <span className="text-xs text-[#7d9b76] hover:underline">
                            {isAnnComposerOpen ? "Close Form" : "Open Form"}
                          </span>
                        </button>

                        <AnimatePresence>
                          {isAnnComposerOpen && (
                            <motion.form
                              onSubmit={handleAnnouncementSubmit}
                              initial={{ opacity: 0, height: 0, marginTop: 0 }}
                              animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                              exit={{ opacity: 0, height: 0, marginTop: 0 }}
                              className="space-y-3 overflow-hidden pt-3 border-t border-slate-200/50"
                            >
                              <input
                                type="text"
                                required
                                placeholder="Announcement Title"
                                value={annTitle}
                                onChange={(e) => setAnnTitle(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-white"
                              />
                              <textarea
                                required
                                placeholder="Announcement content..."
                                rows={3}
                                value={annContent}
                                onChange={(e) => setAnnContent(e.target.value)}
                                className="w-full p-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-white resize-none"
                              />
                              
                              {/* Attached Images Preview */}
                              {annImages.length > 0 && (
                                <div className="flex gap-2 flex-wrap py-2">
                                  {annImages.map((img, i) => (
                                    <div key={i} className="relative w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shrink-0">
                                      <img src={img} className="w-full h-full object-cover" alt="Preview" />
                                      <button
                                        type="button"
                                        onClick={() => removeAnnImage(i)}
                                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full grid place-items-center cursor-pointer"
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="flex justify-between items-center pt-2">
                                <input
                                  type="file"
                                  ref={annFileInputRef}
                                  onChange={handleAnnImageUpload}
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() => annFileInputRef.current?.click()}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer transition"
                                >
                                  <ImageIcon className="w-3.5 h-3.5 text-[#7d9b76]" />
                                  Attach Images
                                </button>
                                <button
                                  type="submit"
                                  className="px-4 py-1.5 rounded-full bg-[#7d9b76] text-white text-xs font-semibold hover:bg-[#6b8865] transition cursor-pointer"
                                >
                                  Post Announcement
                                </button>
                              </div>
                            </motion.form>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Announcement Cards List */}
                    {announcements.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-2xl border border-[#dce5d4] shadow-sm">
                        <p className="text-sm text-slate-500 font-medium">No announcements posted for this section yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {announcements.map((a) => {
                          const isSelected = selectedAnnId === a.id;
                          return (
                            <div
                              key={a.id}
                              onClick={() => setSelectedAnnId(a.id)}
                              className={cn(
                                "rounded-2xl border bg-white p-4 shadow-sm hover:border-[#7d9b76]/60 transition cursor-pointer relative group",
                                isSelected ? "border-[#7d9b76] ring-1 ring-[#7d9b76]" : "border-[#dce5d4]"
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  {a.pinned && (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/50">
                                      Pinned
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400">
                                    {relativeTime(a.createdAt)}
                                  </span>
                                </div>

                                {/* 3-Dot menu for faculty */}
                                {isFacultyView && (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger className="h-6 w-6 grid place-items-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer focus:outline-none">
                                        <MoreHorizontal className="w-3.5 h-3.5" />
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-40">
                                        <DropdownMenuItem
                                          onClick={async () => {
                                            try {
                                              await hub.pinAnnouncement(Number(a.id), !a.pinned);
                                              toast.success(a.pinned ? "Unpinned" : "Pinned to top");
                                            } catch {
                                              toast.error("Could not update announcement");
                                            }
                                          }}
                                          className="text-xs font-semibold text-slate-700 focus:bg-slate-50 cursor-pointer"
                                        >
                                          <ShieldCheck className="w-4 h-4 mr-2 text-[#7d9b76]" />
                                          {a.pinned ? "Unpin" : "Pin to Top"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={async () => {
                                            if (!confirm("Delete this announcement?")) return;
                                            try {
                                              await hub.deleteAnnouncement(a.id);
                                              toast.success("Announcement deleted");
                                            } catch {
                                              toast.error("Could not delete announcement");
                                            }
                                          }}
                                          className="text-xs font-semibold text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer"
                                        >
                                          <X className="w-4 h-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                              </div>

                              <div className="mt-2">
                                <h4 className="font-display text-sm font-bold text-slate-800 leading-tight">
                                  {a.title}
                                </h4>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                  {a.content}
                                </p>
                              </div>

                              <div className="flex items-center justify-between gap-4 mt-3 pt-2.5 border-t border-slate-100/50 text-[10px] text-slate-400">
                                <span className="font-medium text-slate-600 flex items-center gap-1.5">By {a.author.initials} <RoleBadge role={a.author.role} name={a.author.name} /></span>
                                <div className="flex items-center gap-2">
                                  {a.images && a.images.length > 0 && (
                                    <span>{a.images.length} image{a.images.length === 1 ? "" : "s"}</span>
                                  )}
                                  <span>Comments</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Selected Announcement details & comments */}
                  {selectedAnnId && (
                    <div className="lg:col-span-7 bg-white rounded-2xl border border-[#dce5d4] p-5 md:p-6 shadow-sm space-y-6">
                      {(() => {
                        const ann = announcements.find((a) => a.id === selectedAnnId);
                        if (!ann) return <p className="text-sm text-slate-400 py-6 text-center">Select an announcement to view details.</p>;
                        return (
                          <>
                            {/* Detail header */}
                            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 flex-wrap">
                              <div className="flex items-center gap-3">
                                <span className="grid place-items-center w-8 h-8 rounded-lg bg-[#a8c0a0]/20 text-[#7d9b76] text-xs font-bold shrink-0">
                                  {ann.author.initials}
                                </span>
                                <div>
                                  <h3 className="text-sm font-bold text-slate-800 leading-tight">
                                    {ann.author.name}
                                  </h3>
                                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 flex-wrap">
                                    <RoleBadge role={ann.author.role} name={ann.author.name} />
                                    <span>Â· {ann.createdAt.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {ann.pinned && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/50">
                                    Pinned
                                  </span>
                                )}
                                <button
                                  onClick={() => setSelectedAnnId(null)}
                                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Details Content */}
                            <div>
                              <h2 className="font-display text-xl font-bold text-slate-800 leading-snug">
                                {ann.title}
                              </h2>
                              <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap leading-relaxed">
                                {ann.content}
                              </p>

                              {/* Attachment Images */}
                              {ann.images && ann.images.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                                  {ann.images.map((img, i) => (
                                    <div
                                      key={i}
                                      onClick={() => {
                                        const w = window.open();
                                        w?.document.write(`<img src="${img}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                                      }}
                                      className="aspect-video rounded-xl border border-slate-100 overflow-hidden cursor-pointer bg-slate-50 aspect-video group"
                                    >
                                      <img src={img} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" alt="Attachment" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Embedded Comments Thread */}
                            <div className="pt-6 border-t border-slate-100">
                              <AnnouncementComments announcementId={ann.id} />
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* 2. ASK QUESTION TAB */}
              <TabsContent value="doubts" className="mt-0 focus-visible:outline-none">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Doubts list */}
                  <div className={cn("space-y-4", selectedDoubtId ? "lg:col-span-5" : "lg:col-span-12")}>
                    {/* Student composer */}
                    {!isFacultyView && (
                      <div className="rounded-2xl border border-[#dce5d4] bg-[#faf8f3] p-4 shadow-sm">
                        <button
                          onClick={() => setIsDoubtComposerOpen((prev) => !prev)}
                          className="flex items-center justify-between w-full font-display text-sm font-semibold text-slate-800 cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Plus className="w-4 h-4 text-[#7d9b76]" />
                            Ask a Doubt / Question
                          </span>
                          <span className="text-xs text-[#7d9b76] hover:underline">
                            {isDoubtComposerOpen ? "Close Form" : "Open Form"}
                          </span>
                        </button>

                        <AnimatePresence>
                          {isDoubtComposerOpen && (
                            <motion.form
                              onSubmit={handleDoubtSubmit}
                              initial={{ opacity: 0, height: 0, marginTop: 0 }}
                              animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                              exit={{ opacity: 0, height: 0, marginTop: 0 }}
                              className="space-y-3 overflow-hidden pt-3 border-t border-slate-200/50"
                            >
                              <input
                                type="text"
                                required
                                placeholder="What is your doubt about? (e.g. Memory leaks in constructor)"
                                value={doubtQuestion}
                                onChange={(e) => setDoubtQuestion(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-white"
                              />
                              <textarea
                                required
                                placeholder="Explain your question in detail here. What code blocks or edge cases are you struggling with?"
                                rows={3}
                                value={doubtDesc}
                                onChange={(e) => setDoubtDesc(e.target.value)}
                                className="w-full p-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-white resize-none"
                              />

                              {/* Images Previews */}
                              {doubtImages.length > 0 && (
                                <div className="flex gap-2 flex-wrap py-2">
                                  {doubtImages.map((img, i) => (
                                    <div key={i} className="relative w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shrink-0">
                                      <img src={img} className="w-full h-full object-cover" alt="Preview" />
                                      <button
                                        type="button"
                                        onClick={() => removeDoubtImage(i)}
                                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full grid place-items-center cursor-pointer"
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="flex justify-between items-center pt-2">
                                <input
                                  type="file"
                                  ref={doubtFileInputRef}
                                  onChange={handleDoubtImageUpload}
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() => doubtFileInputRef.current?.click()}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer transition"
                                >
                                  <ImageIcon className="w-3.5 h-3.5 text-[#7d9b76]" />
                                  Attach Images
                                </button>
                                <button
                                  type="submit"
                                  className="px-4 py-1.5 rounded-full bg-[#7d9b76] text-white text-xs font-semibold hover:bg-[#6b8865] transition cursor-pointer"
                                >
                                  Post Question
                                </button>
                              </div>
                            </motion.form>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Doubts list cards */}
                    {doubts.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-2xl border border-[#dce5d4] shadow-sm">
                        <p className="text-sm text-slate-500 font-medium">No doubts posted for this section yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {doubts.map((d) => {
                          const isSelected = selectedDoubtId === d.id;
                          const count = getAnswerCount(d.id);
                          const hasSolved =
                            Boolean(d.isVerified) ||
                            (selectedDoubtDetail?.id === d.id &&
                              (selectedDoubtDetail.answers?.some(
                                (a) => a.isVerified || a.author.role === "faculty"
                              ) ??
                                false));

                          return (
                            <div
                              key={d.id}
                              onClick={() => setSelectedDoubtId(d.id)}
                              className={cn(
                                "rounded-2xl border bg-white p-4 shadow-sm hover:border-[#7d9b76]/60 transition cursor-pointer relative",
                                isSelected ? "border-[#7d9b76] ring-1 ring-[#7d9b76]" : "border-[#dce5d4]"
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] text-slate-400">
                                  {relativeTime(d.createdAt)}
                                </span>
                                {hasSolved && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50 uppercase tracking-wider">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Solved
                                  </span>
                                )}
                              </div>

                              <div className="mt-2">
                                <h4 className="font-display text-sm font-bold text-slate-800 leading-tight">
                                  {d.question}
                                </h4>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                  {d.description}
                                </p>
                              </div>

                              <div className="flex items-center justify-between gap-4 mt-3 pt-2.5 border-t border-slate-100/50 text-[10px] text-slate-400">
                                <span className="font-medium text-slate-600 flex items-center gap-1.5">By {d.author.name} <RoleBadge role={d.author.role} name={d.author.name} /></span>
                                <div className="flex items-center gap-2">
                                  {d.images && d.images.length > 0 && (
                                    <span>{d.images.length} image{d.images.length === 1 ? "" : "s"}</span>
                                  )}
                                  <span>{count} repl{count === 1 ? "y" : "ies"}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Selected doubt details and comments tree */}
                  {selectedDoubtId && (
                    <div className="lg:col-span-7 bg-white rounded-2xl border border-[#dce5d4] p-5 md:p-6 shadow-sm space-y-6">
                      {(() => {
                        const doubt = selectedDoubtDetail ?? doubts.find((d) => d.id === selectedDoubtId);
                        if (!doubt) return <p className="text-sm text-slate-400 py-6 text-center">Loading doubt…</p>;
                        return (
                          <>
                            {/* Detail header */}
                            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 flex-wrap">
                              <div className="flex items-center gap-3">
                                <span className="grid place-items-center w-8 h-8 rounded-lg bg-[#7d9b76]/10 text-[#7d9b76] text-xs font-bold shrink-0">
                                  {doubt.author.initials}
                                </span>
                                <div>
                                  <h3 className="text-sm font-bold text-slate-800 leading-tight">
                                    {doubt.author.name}
                                  </h3>
                                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 flex-wrap">
                                    <RoleBadge role={doubt.author.role} name={doubt.author.name} />
                                    <span>Â· {doubt.createdAt.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isFacultyView && !doubt.isVerified && (
                                  <button
                                    type="button"
                                    onClick={() => void handleSectionMarkSolved()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 text-[11px] font-bold transition cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Mark solved
                                  </button>
                                )}
                                {!isFacultyView && profile.role !== "admin" && (
                                  <button
                                    onClick={() => {
                                      if (doubt.reported) {
                                        toast.info("This doubt has already been reported.");
                                        return;
                                      }
                                      setIsDoubtReportOpen(true);
                                    }}
                                    disabled={doubt.reported}
                                    className={cn(
                                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition cursor-pointer",
                                      doubt.reported
                                        ? "border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed"
                                        : "border-rose-200 text-rose-600 bg-rose-50/50 hover:bg-rose-50"
                                    )}
                                    title={doubt.reported ? "Already reported" : "Report doubt thread"}
                                  >
                                    <Flag className="w-3.5 h-3.5" />
                                    {doubt.reported ? "Reported" : "Report"}
                                  </button>
                                )}
                                <button
                                  onClick={() => setSelectedDoubtId(null)}
                                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Details Content */}
                            <div>
                              <h2 className="font-display text-xl font-bold text-slate-800 leading-snug">
                                {doubt.question}
                              </h2>
                              <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap leading-relaxed">
                                {doubt.description}
                              </p>

                              {/* Attached images grid */}
                              {doubt.images && doubt.images.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                                  {doubt.images.map((img, i) => (
                                    <div
                                      key={i}
                                      onClick={() => {
                                        const w = window.open();
                                        w?.document.write(`<img src="${img}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                                      }}
                                      className="aspect-video rounded-xl border border-slate-100 overflow-hidden cursor-pointer bg-slate-50 aspect-video group"
                                    >
                                      <img src={img} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" alt="Attachment" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Answers */}
                            <div className="pt-6 border-t border-slate-100 space-y-4">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Answers ({doubt.answers?.length ?? 0})
                              </h4>
                              {(doubt.answers ?? []).map((ans) => (
                                <div key={ans.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                                  <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <RoleBadge role={ans.author.role} name={ans.author.name} />
                                      <span>{ans.createdAt.toLocaleString()}</span>
                                      {ans.isOfficial && (
                                        <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                          <CheckCircle2 className="w-3 h-3" /> Official solution
                                        </span>
                                      )}
                                      {ans.isEndorsed && !ans.isOfficial && (
                                        <span className="text-emerald-600 font-bold">Faculty endorsed</span>
                                      )}
                                      {ans.isVerified && ans.author.role === "faculty" && (
                                        <span className="text-sky-700 font-bold">Faculty answer</span>
                                      )}
                                    </div>
                                    {isFacultyView &&
                                      !ans.isOfficial &&
                                      !ans.isEndorsed &&
                                      ans.author.role === "student" && (
                                        <button
                                          type="button"
                                          onClick={() => void handleSectionVerifyAnswer(ans.id)}
                                          className="text-[9px] bg-[#7d9b76]/10 text-[#5d7d56] px-2 py-0.5 rounded border border-[#dce5d4] font-bold uppercase tracking-wider hover:bg-[#7d9b76]/20 cursor-pointer shrink-0"
                                        >
                                          Accept as official solution
                                        </button>
                                      )}
                                  </div>
                                  <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{ans.content}</p>
                                </div>
                              ))}
                              <form onSubmit={handleDoubtAnswerSubmit} className="flex gap-2">
                                <input
                                  type="text"
                                  value={doubtAnswerText}
                                  onChange={(e) => setDoubtAnswerText(e.target.value)}
                                  placeholder={
                                    isFacultyView
                                      ? "Post a verified answer…"
                                      : "Write an answer…"
                                  }
                                  className="flex-1 h-9 px-3 rounded-xl border border-[#dce5d4] text-xs focus:outline-none focus:ring-1 focus:ring-[#7d9b76]"
                                />
                                <button
                                  type="submit"
                                  className="h-9 px-4 bg-[#7d9b76] text-white text-xs font-bold rounded-xl shrink-0"
                                >
                                  {isFacultyView ? "Post verified" : "Reply"}
                                </button>
                              </form>
                            </div>

                            <ReportModal
                              isOpen={isDoubtReportOpen}
                              onClose={() => setIsDoubtReportOpen(false)}
                              onSubmit={(reason, details) => {
                                doubt.reported = true;
                                doubt.reportReason = reason;
                                doubt.reportDetails = details;
                                setSelectedDoubtDetail({ ...doubt });
                                toast.success("Doubt reported. It has been sent to moderation.");
                              }}
                              itemType="doubt"
                            />
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* 3. CHAT ROOM TAB */}
              <TabsContent value="chat" className="mt-0 focus-visible:outline-none">
                <div className="rounded-[1.5rem] border border-[#dce5d4] bg-white shadow-sm flex flex-col h-[600px] overflow-hidden">
                  
                  {/* Chat Info Header */}
                  <header className="p-4 border-b border-slate-100 bg-[#faf8f3] flex items-center justify-between shrink-0">
                    <div>
                      <h3 className="font-display text-sm font-bold text-slate-800">Section {offering.section} Group Chat</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Faculty, CR, and all students can chat here.</p>
                    </div>
                    <span className={`text-[9px] uppercase tracking-widest font-black ${wsConnected ? "text-emerald-600" : "text-amber-600"}`}>
                      {wsConnected ? "Live" : "Syncing"}
                    </span>
                  </header>

                  {/* Message Logs */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#faf8f3]/25 scrollbar-thin">
                    {chatMessages.length === 0 ? (
                      <p className="text-slate-400 text-xs py-10 text-center">No messages yet. Send a hello!</p>
                    ) : (
                      chatMessages.map((msg) => {
                        const isSelf =
                          profile.name &&
                          msg.author.name.toLowerCase() === profile.name.toLowerCase();
                        const isFaculty = msg.author.role === "faculty";
                        return (
                          <div
                            key={msg.id}
                            className={cn(
                              "flex flex-col max-w-[75%] rounded-2xl p-3 shadow-sm",
                              isSelf
                                ? "ml-auto bg-[#7d9b76] text-white rounded-br-none"
                                : isFaculty
                                  ? "bg-amber-50 border border-amber-200 text-slate-800 rounded-bl-none"
                                  : "bg-white border border-[#dce5d4] text-slate-800 rounded-bl-none"
                            )}
                          >
                            <div className="flex items-center gap-1.5 text-[9px] font-bold mb-1 opacity-90 flex-wrap">
                              <span className={isSelf ? "text-white/90" : "text-slate-600"}>
                                {msg.author.name}
                              </span>
                              <RoleBadge role={msg.author.role} name={msg.author.name} />
                            </div>
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <span className={cn(
                              "text-[8px] mt-1.5 self-end opacity-70",
                              isSelf ? "text-white/80" : "text-slate-400"
                            )}>
                              {msg.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handleChatSend} className="p-3 border-t border-slate-100 bg-white flex gap-2 items-center shrink-0">
                    <input
                      type="text"
                      required
                      placeholder="Send a chat message to your section..."
                      value={chatInputText}
                      onChange={(e) => setChatInputText(e.target.value)}
                      className="flex-1 h-10 px-4 rounded-full border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-[#faf8f3]"
                    />
                    <button
                      type="submit"
                      className="grid place-items-center w-10 h-10 rounded-full bg-[#7d9b76] text-white hover:bg-[#6b8865] shrink-0 transition shadow-sm cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </TabsContent>

              <TabsContent value="section-resources" className="mt-0 focus-visible:outline-none">
                <SectionResourcesTab courseCode={code} sectionLabel={sectionLabel} />
              </TabsContent>

              {/* 4. TASKS & SCHEDULE TAB */}
              <TabsContent value="schedule" className="mt-0 focus-visible:outline-none animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Class Timings */}
                  <div className="md:col-span-2 bg-white border border-[#dce5d4] rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                      <Calendar className="w-5 h-5 text-[#7d9b76]" />
                      <h3 className="font-display text-lg font-bold text-slate-800">Class Section Schedule</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {offering.days.map((day, i) => (
                        <div key={i} className="flex flex-col gap-2 p-4 bg-[#faf8f3] rounded-xl border border-[#dce5d4]/40 hover:border-[#7d9b76]/30 transition">
                          <span className="inline-block self-start px-2 py-0.5 rounded bg-[#7d9b76] text-white text-[10px] font-black uppercase tracking-wider">
                            {day}
                          </span>
                          <span className="text-sm font-bold text-slate-800">{offering.times[i]}</span>
                          <span className="text-xs text-slate-500 font-medium">Room {offering.rooms[i] || offering.rooms[0]}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Trimester Course Info
                      </h4>
                      <div className="grid grid-cols-2 gap-y-2 text-[11px] text-slate-600 font-semibold">
                        <div>Course Code: <span className="font-bold text-slate-800">{offering.course_code}</span></div>
                        <div>Total Credits: <span className="font-bold text-slate-800">{offering.credit} credits</span></div>
                        <div>Initial: <span className="font-bold text-slate-800">{offering.faculty_initial}</span></div>
                        <div>Trimester: <span className="font-bold text-slate-800">{offering.semester_label || "Current trimester"}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Grading Milestones & Deadlines */}
                  <div className="bg-white border border-[#dce5d4] rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <ClipboardList className="w-4 h-4 text-[#7d9b76]" />
                      <h3 className="font-display text-sm font-bold text-slate-800">Grading Deadlines</h3>
                    </div>

                    <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-100">
                      {exams.length === 0 ? (
                        <p className="text-[10px] text-slate-400 pl-7">No assignment deadlines yet.</p>
                      ) : (
                        exams.map((exam) => {
                          const due = exam.deadline ? new Date(exam.deadline) : null;
                          const isPast = due ? due.getTime() < Date.now() : false;
                          const gradedCount = exam.submissions?.filter((s) => s.marksObtained !== undefined).length ?? 0;
                          const totalSubs = exam.submissions?.length ?? 0;
                          const allGraded = totalSubs > 0 && gradedCount === totalSubs;
                          return (
                            <div key={exam.id} className="relative pl-7 space-y-0.5">
                              <span
                                className={`absolute left-1.5 top-1 w-3.5 h-3.5 rounded-full border border-white ${
                                  allGraded ? "bg-slate-200" : isPast ? "bg-amber-500 ring-2 ring-amber-100" : "bg-slate-300"
                                }`}
                              />
                              <h4 className={`text-xs font-bold ${allGraded ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                {exam.title}
                              </h4>
                              <p className={`text-[10px] font-semibold ${isPast && !allGraded ? "text-amber-600" : "text-slate-500"}`}>
                                {exam.deadline ? exam.deadline.replace("T", " ") : "No deadline"} ({exam.maxMarks} marks)
                                {totalSubs > 0 ? ` · ${gradedCount}/${totalSubs} graded` : ""}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>

                <div className="mt-8 space-y-4">
                  <div className="rounded-2xl border border-[#dce5d4] bg-[#faf8f3] p-4 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setIsCreateExamOpen((prev) => !prev)}
                      className="flex items-center justify-between w-full font-display text-sm font-semibold text-slate-800 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-[#7d9b76]" />
                        Create assignment / exam portal
                      </span>
                      <span className="text-xs text-[#7d9b76]">
                        {isCreateExamOpen ? "Close" : "Open"}
                      </span>
                    </button>
                    {isCreateExamOpen && (
                      <form onSubmit={handleCreateExamSubmit} className="space-y-3 pt-3 mt-3 border-t border-slate-200/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            required
                            placeholder="Title"
                            value={newExamTitle}
                            onChange={(e) => setNewExamTitle(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] text-xs bg-white"
                          />
                          <input
                            type="number"
                            required
                            min={1}
                            placeholder="Max marks"
                            value={newExamMaxMarks}
                            onChange={(e) => setNewExamMaxMarks(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] text-xs bg-white"
                          />
                        </div>
                        <input
                          type="datetime-local"
                          value={newExamDeadline}
                          onChange={(e) => setNewExamDeadline(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] text-xs bg-white"
                        />
                        <textarea
                          rows={3}
                          placeholder="Instructions"
                          value={newExamQuestions}
                          onChange={(e) => setNewExamQuestions(e.target.value)}
                          className="w-full p-3 rounded-xl border border-[#dce5d4] text-xs bg-white resize-none"
                        />
                        <button
                          type="submit"
                          className="w-full h-9 bg-[#7d9b76] hover:bg-[#6c8766] text-white text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Create portal
                        </button>
                      </form>
                    )}
                  </div>

                  {exams.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active assignments</h3>
                      {exams.map((exam) => {
                        const submissionsCount = exam.submissions?.length || 0;
                        const gradedCount =
                          exam.submissions?.filter((s) => s.marksObtained !== undefined).length || 0;
                        const progress = submissionsCount
                          ? Math.round((gradedCount / submissionsCount) * 100)
                          : 0;
                        return (
                          <div
                            key={exam.id}
                            onClick={() =>
                              navigate({
                                to: "/courses/$courseCode/submissions",
                                params: { courseCode: encodeCourseCode(code) },
                                search: { examId: exam.id, section: offering.section },
                              })
                            }
                            className="p-4 rounded-xl border bg-white cursor-pointer hover:border-[#7d9b76] transition"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-bold text-slate-800">{exam.title}</h4>
                              <span className="text-[10px] text-emerald-600 font-bold">{progress}% graded</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                              Due {exam.deadline?.replace("T", " ") || "—"} · {gradedCount}/{submissionsCount} submissions
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <TaskWorkspace
                    sectionKey={`${code}::${sectionLabel}`}
                    variant="section"
                  />
                </div>

              </TabsContent>

              {/* 5. GRADEBOOK TAB */}
              <TabsContent value="students" className="mt-0 focus-visible:outline-none animate-in fade-in duration-200">
                <SectionGradebookPanel courseCode={code} sectionLabel={sectionLabel} />
              </TabsContent>

              {/* 6. PROJECT TEAMS TAB */}
              {hasTeamMgmt && (
                <TabsContent value="project-teams" className="mt-0 focus-visible:outline-none animate-in fade-in duration-200">
                  <div className="space-y-6">
                    
                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 border-y border-[#dce5d4]/40 bg-[#faf8f3]/25 px-4 rounded-2xl">
                      <div>
                        <h4 className="text-xs text-slate-500 font-bold">
                          Total Active Course Teams: <span className="text-slate-800 font-bold">{sectionTeams.length}</span>
                        </h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {unassignedStudents.length} students remain unassigned to any team.
                        </p>
                      </div>

                      <button
                        onClick={() => setIsCreateTeamOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#7d9b76] hover:bg-[#6b8865] text-white text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Create Team Manually
                      </button>
                    </div>

                    {/* Teams Grid */}
                    {sectionTeams.length === 0 ? (
                      <div className="text-center py-16 bg-white border border-[#dce5d4] rounded-2xl shadow-sm">
                        <Users className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                        <p className="text-sm text-slate-500 font-medium">No project teams created for this section yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {sectionTeams.map((team) => {
                          const acceptedMembers = team.members.filter(m => m.status === "accepted");
                          
                          return (
                            <div 
                              key={team.id}
                              className="bg-white border border-[#dce5d4] rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden hover:border-[#7d9b76]/60 transition duration-300 group"
                            >
                              {/* Header */}
                              <div className="p-5 border-b border-slate-100 flex justify-between items-start gap-4">
                                <div>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-[9px] font-black text-emerald-700 font-mono tracking-wider">
                                    {team.courseCode} Sec {offering.section}
                                  </span>
                                  <h3 className="font-display text-lg font-black text-slate-800 tracking-tight mt-1">
                                    Team {team.teamName}
                                  </h3>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition shrink-0 cursor-pointer"
                                      title="Team Actions"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-36">
                                    <DropdownMenuItem
                                      onClick={() => handleOpenEditTeamModal(team)}
                                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg cursor-pointer transition"
                                    >
                                      <Edit className="w-3.5 h-3.5 text-[#7d9b76]" />
                                      Edit Team
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteTeamClick(team.id, team.teamName)}
                                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg cursor-pointer transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      Delete Team
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              {/* Members & Grades */}
                              <div className="p-5 space-y-4 flex-1">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Roster & Project Grades
                                </h4>

                                <div className="space-y-3.5">
                                  {team.members.map((member) => {
                                    const isLeader = member.email.trim().toLowerCase() === team.leaderEmail.trim().toLowerCase();
                                    const isPending = member.status === "pending";
                                    
                                    // Lookup grades for student
                                    const student = students.find(s => s.email.trim().toLowerCase() === member.email.trim().toLowerCase());
                                    const prGrades = student ? student.projectGrades || [] : [];

                                    return (
                                      <div key={member.email} className="space-y-1.5 pl-1.5 border-l-2 border-slate-100 hover:border-[#7d9b76]/40 transition pl-3">
                                        <div className="flex items-center justify-between gap-4 flex-wrap">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            {isLeader ? (
                                              <>
                                                <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                                                <span className="text-xs font-bold text-slate-800 truncate">
                                                  {member.name || student?.name || member.email}
                                                </span>
                                                <span className="text-[8px] bg-amber-50 border border-amber-200 text-amber-600 px-1 py-0.25 rounded font-black uppercase tracking-wider shrink-0">
                                                  Leader
                                                </span>
                                              </>
                                            ) : (
                                              <>
                                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isPending ? "bg-amber-400" : "bg-slate-300")} />
                                                <span className={cn("text-xs font-semibold truncate", isPending ? "text-slate-400 italic" : "text-slate-700")}>
                                                  {member.name || student?.name || member.email}
                                                </span>
                                              </>
                                            )}
                                          </div>

                                          {/* Actions: Grade */}
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            {/* Individual Grading button */}
                                            {!isPending && (
                                              <button
                                                onClick={() => {
                                                  setGradeComponentName("");
                                                  setGradeObtained("");
                                                  setGradeMax("10");
                                                  setGradeFeedback("");
                                                  setGradingTarget({
                                                    type: "member",
                                                    targetId: student?.id || "",
                                                    name: student?.name || member.email,
                                                    email: member.email
                                                  });
                                                }}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-[#7d9b76] hover:text-white border border-[#dce5d4] hover:bg-[#7d9b76] bg-white rounded-xl transition duration-200 cursor-pointer shadow-sm active:scale-95 shrink-0"
                                              >
                                                <Award className="w-3.5 h-3.5" />
                                                Grade
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {/* Project Grades list */}
                                        {!isPending && (
                                          <div className="flex gap-1.5 flex-wrap pl-3">
                                            {prGrades.length === 0 ? (
                                              <span className="text-[10px] text-slate-400 italic font-medium">No project grades yet</span>
                                            ) : (
                                              prGrades.map((g, gi) => (
                                                <span 
                                                  key={gi} 
                                                  className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#faf8f3] border border-[#dce5d4]/60 text-[9px] font-bold text-slate-600"
                                                  title={g.feedback ? `Feedback: ${g.feedback}` : undefined}
                                                >
                                                  {g.componentName}: {g.marksObtained}/{g.maxMarks}
                                                </span>
                                              ))
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Footer Operations */}
                              <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end text-xs gap-3 shrink-0 flex-wrap">
                                
                                {/* Grade Team Button */}
                                {acceptedMembers.length > 0 && (
                                  <button
                                    onClick={() => {
                                      setGradeComponentName("");
                                      setGradeObtained("");
                                      setGradeMax("10");
                                      setGradeFeedback("");
                                      setGradingTarget({
                                        type: "team",
                                        targetId: team.id,
                                        name: team.teamName
                                      });
                                    }}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition duration-200 cursor-pointer shadow-sm shadow-amber-500/10 active:scale-95 shrink-0"
                                  >
                                    <Award className="w-3.5 h-3.5" />
                                    Grade Whole Team
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

              {/* 6. EXAMS & ASSIGNMENTS TAB */}
              <TabsContent value="exams" className="mt-0 focus-visible:outline-none">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Faculty View */}
                  {isFacultyView && (
                    <div className="lg:col-span-12 space-y-4">
                      {/* Exam Creator Form */}
                      <div className="rounded-2xl border border-[#dce5d4] bg-[#faf8f3] p-4 shadow-sm">
                        <button
                          onClick={() => setIsCreateExamOpen((prev) => !prev)}
                          className="flex items-center justify-between w-full font-display text-sm font-semibold text-slate-800 cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Plus className="w-4 h-4 text-[#7d9b76]" />
                            Create New Exam/Assignment
                          </span>
                          <span className="text-xs text-[#7d9b76] hover:underline">
                            {isCreateExamOpen ? "Close Form" : "Open Form"}
                          </span>
                        </button>

                        <AnimatePresence>
                          {isCreateExamOpen && (
                            <motion.form
                              onSubmit={handleCreateExamSubmit}
                              initial={{ opacity: 0, height: 0, marginTop: 0 }}
                              animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                              exit={{ opacity: 0, height: 0, marginTop: 0 }}
                              className="space-y-3 overflow-hidden pt-3 border-t border-slate-200/50"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Title</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. Midterm Programming Assignment"
                                    value={newExamTitle}
                                    onChange={(e) => setNewExamTitle(e.target.value)}
                                    className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Max Marks</label>
                                  <input
                                    type="number"
                                    required
                                    min="1"
                                    placeholder="e.g. 20"
                                    value={newExamMaxMarks}
                                    onChange={(e) => setNewExamMaxMarks(e.target.value)}
                                    className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-white"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deadline</label>
                                  <input
                                    type="datetime-local"
                                    value={newExamDeadline}
                                    onChange={(e) => setNewExamDeadline(e.target.value)}
                                    className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attachment Document (Optional)</label>
                                  <input
                                    key={fileInputKey}
                                    type="file"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        setNewExamAttachmentName(e.target.files[0].name);
                                      }
                                    }}
                                    className="w-full h-9 px-3 py-1.5 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-white file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-[#7d9b76] file:text-white file:cursor-pointer"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Instructions / Questions</label>
                                <textarea
                                  rows={4}
                                  placeholder="Write instructions, question links, or assignment specifications here..."
                                  value={newExamQuestions}
                                  onChange={(e) => setNewExamQuestions(e.target.value)}
                                  className="w-full p-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-white resize-none"
                                />
                              </div>

                              <button
                                type="submit"
                                className="w-full h-9 bg-[#7d9b76] hover:bg-[#6c8766] text-white text-xs font-bold rounded-xl transition duration-200 cursor-pointer shadow-sm shadow-[#7d9b76]/10"
                              >
                                Create Portal Event
                              </button>
                            </motion.form>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* List of Exams */}
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Portals</h3>
                        {exams.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                            No exam or assignment portals created yet.
                          </div>
                        ) : (
                          exams.map((exam) => {
                            const submissionsCount = exam.submissions?.length || 0;
                            const gradedCount = exam.submissions?.filter((s) => s.marksObtained !== undefined).length || 0;

                            return (
                              <div
                                key={exam.id}
                                onClick={() =>
                                  navigate({
                                    to: "/courses/$courseCode/submissions",
                                    params: { courseCode: encodeCourseCode(code) },
                                    search: { examId: exam.id, section: offering.section },
                                  })
                                }
                                className="p-4 rounded-xl border bg-white shadow-sm hover:shadow-md cursor-pointer transition relative border-slate-200 hover:border-[#7d9b76] transition-colors group"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-[#7d9b76] uppercase tracking-wider bg-[#7d9b76]/10 px-2 py-0.5 rounded">
                                    Max Marks: {exam.maxMarks}
                                  </span>
                                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                      <Clock className="w-3 h-3" />
                                      Due: {exam.deadline?.replace("T", " ")}
                                    </span>
                                    
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className="p-1 rounded-full hover:bg-slate-105 text-slate-400 hover:text-slate-600 transition duration-150 cursor-pointer shrink-0">
                                          <MoreHorizontal className="w-3.5 h-3.5" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="min-w-[120px]">
                                        <DropdownMenuItem
                                          onClick={() => handleOpenEditExamModal(exam)}
                                          className="flex items-center gap-2 px-2.5 py-1.8 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer transition"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                          Edit Portal
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleDeleteExamClick(exam.id, exam.title)}
                                          className="flex items-center gap-2 px-2.5 py-1.8 text-xs font-semibold text-rose hover:bg-rose/5 rounded-lg cursor-pointer transition"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                          Delete Portal
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>

                                <h4 className="font-display text-sm font-bold text-slate-800 mt-2">
                                  {exam.title}
                                </h4>

                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-semibold">
                                  <span>Created: {new Date(exam.createdAt).toLocaleDateString()}</span>
                                  <span>
                                    {submissionsCount} Submission{submissionsCount !== 1 && "s"} ({gradedCount} Graded)
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Student View */}
                  {!isFacultyView && (
                    <div className="lg:col-span-12 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="font-display text-xl font-bold tracking-tight text-slate-800">
                            Available Exams & Assignments
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Submit your solutions or download instructions files and check marks.
                          </p>
                        </div>
                      </div>

                      {exams.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
                          No active exams or assignments posted for your section yet.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {exams.map((exam) => {
                            const emailToUse = profile.email ?? "";
                            const submission =
                              exam.submissions?.length === 1
                                ? exam.submissions[0]
                                : exam.submissions?.find(
                                    (s) =>
                                      s.studentEmail.toLowerCase().trim() ===
                                      emailToUse.toLowerCase().trim()
                                  );
                            const isGraded = submission?.marksObtained !== undefined;

                            return (
                              <div
                                key={exam.id}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 hover:shadow-md transition"
                              >
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <span className="text-[10px] font-bold text-[#7d9b76] uppercase tracking-wider bg-[#7d9b76]/10 px-2 py-0.5 rounded">
                                    Marks: {exam.maxMarks}
                                  </span>
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                                    <Clock className="w-3 h-3" />
                                    Deadline: {exam.deadline?.replace("T", " ")}
                                  </span>
                                </div>

                                <div>
                                  <h3 className="font-display text-base font-bold text-slate-850">
                                    {exam.title}
                                  </h3>
                                  <div className="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-xl whitespace-pre-wrap">
                                    {exam.questions}
                                  </div>
                                </div>

                                {exam.attachmentName && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400">Attachment:</span>
                                    <button
                                      onClick={() => toast.info("No attachment file on this portal.")}
                                      className="text-xs text-[#7d9b76] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      {exam.attachmentName}
                                    </button>
                                  </div>
                                )}

                                {/* Submission Status Panel */}
                                <div className="pt-3 border-t border-slate-100 space-y-3">
                                  {submission ? (
                                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 space-y-2">
                                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                                          <CheckCircle2 className="w-4 h-4" />
                                          Submitted
                                          {(() => {
                                            const timing = getSubmissionTimingStatus(submission.submittedAt, exam.deadline);
                                            return (
                                              <span className={cn(
                                                "px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider",
                                                timing.status === "early"
                                                  ? "bg-emerald-50 text-emerald-600 border-emerald-200/30"
                                                  : "bg-rose-50 text-rose-600 border-rose-200/30"
                                              )}>
                                                {timing.text}
                                              </span>
                                            );
                                          })()}
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                          {new Date(submission.submittedAt).toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="text-xs text-slate-600">
                                        File Name: <span className="font-mono font-bold text-slate-705">{submission.submittedFile}</span>
                                      </div>

                                      {isGraded ? (
                                        <div className="mt-2.5 pt-2.5 border-t border-slate-200/50 space-y-1">
                                          <div className="flex items-center justify-between text-xs font-bold text-[#7d9b76]">
                                            <span className="flex items-center gap-1">
                                              <Award className="w-4 h-4" />
                                              Graded Score:
                                            </span>
                                            <span className="text-sm font-display">{submission.marksObtained} / {exam.maxMarks}</span>
                                          </div>
                                          {submission.feedback && (
                                            <div className="text-[11px] text-slate-550 bg-white p-2 rounded border border-slate-100 mt-1 italic">
                                              <span className="font-bold text-slate-600 font-sans not-italic">Feedback: </span>
                                              "{submission.feedback}"
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-[10px] text-amber-605 font-bold bg-amber-50 px-2 py-1 rounded border border-amber-100 mt-2 text-center uppercase tracking-wider">
                                          Awaiting Grading
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 text-amber-605 text-xs font-bold">
                                      <AlertTriangle className="w-4 h-4" />
                                      Not Submitted Yet
                                    </div>
                                  )}

                                  {/* Student Upload Form */}
                                  <form
                                    onSubmit={(e) => handleStudentSubmitAssignment(e, exam.id)}
                                    className="flex items-center gap-2 mt-2"
                                  >
                                    <input
                                      key={studentSubInputKey}
                                      type="file"
                                      required
                                      onChange={(e) => {
                                        setStudentSubmissionFile(e.target.files?.[0] ?? null);
                                      }}
                                      className="flex-1 h-9 px-3 py-1.5 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-white file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-[#7d9b76] file:text-white file:cursor-pointer"
                                    />
                                    <button
                                      type="submit"
                                      className="h-9 px-4 bg-[#7d9b76] hover:bg-[#6c8766] text-white text-xs font-bold rounded-xl transition duration-200 cursor-pointer shrink-0 shadow-sm"
                                    >
                                      {submission ? "Resubmit" : "Submit File"}
                                    </button>
                                  </form>
                                  {submission && (
                                    <p className="text-[10px] text-slate-400 text-center font-medium mt-1">
                                      You can upload a new file above to overwrite your previous submission.
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* EDIT STUDENT GRADES MODAL */}
          <AnimatePresence>
            {editingStudent && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-[#dce5d4] p-6 shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-display text-base font-bold text-slate-800">
                      Grade Student Details
                    </h3>
                    <button
                      onClick={() => setEditingStudent(null)}
                      className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleStudentGradesSubmit} className="py-4 space-y-4">
                    <div className="p-3 bg-[#faf8f3] rounded-xl border border-[#dce5d4]/40">
                      <p className="text-xs font-bold text-slate-800 leading-none">{editingStudent.name}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-none">{editingStudent.id}</p>
                    </div>

                    {/* CT Marks */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Class Tests Marks (Out of 20)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {editCtMarks.map((m, idx) => (
                          <div key={idx} className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 font-mono">CT {idx + 1}</span>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="20"
                              required
                              value={m}
                              onChange={(e) => {
                                const copy = [...editCtMarks];
                                copy[idx] = e.target.value;
                                setEditCtMarks(copy);
                              }}
                              className="w-full h-8 px-2 border border-[#dce5d4] rounded-lg text-xs font-mono font-bold text-center bg-[#faf8f3] focus:outline-none focus:ring-1 focus:ring-[#7d9b76]"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Midterm Marks */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Midterm Examination (Out of 30)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="30"
                        required
                        value={editMidMarks}
                        onChange={(e) => setEditMidMarks(e.target.value)}
                        className="w-full h-9 px-3 border border-[#dce5d4] rounded-xl text-xs font-mono font-bold bg-[#faf8f3] focus:outline-none focus:ring-1 focus:ring-[#7d9b76]"
                      />
                    </div>

                    {/* Attendance */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Attendance Percentage (0-100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={editAttendance}
                        onChange={(e) => setEditAttendance(e.target.value)}
                        className="w-full h-9 px-3 border border-[#dce5d4] rounded-xl text-xs font-mono font-bold bg-[#faf8f3] focus:outline-none focus:ring-1 focus:ring-[#7d9b76]"
                      />
                    </div>

                    {/* Overall Status */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Overall Performance Status
                      </label>
                      <AppSelect
                        size="sm"
                        value={editStatus}
                        onValueChange={(v) =>
                          setEditStatus(v as StudentGrades["overallStatus"])
                        }
                        options={[
                          { value: "Excellent", label: "Excellent" },
                          { value: "Steady", label: "Steady" },
                          { value: "Needs Attention", label: "Needs Attention" },
                          { value: "Critical Risk", label: "Critical Risk" },
                        ]}
                      />
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingStudent(null)}
                        className="px-4 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-full bg-[#7d9b76] text-white text-xs font-semibold hover:bg-[#6b8865] transition cursor-pointer"
                      >
                        Save Grades
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* EDIT EXAM MODAL */}
          <AnimatePresence>
            {editingExamTarget && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-[#dce5d4] p-6 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-display text-base font-bold text-slate-800 flex items-center gap-1.5">
                      <Edit className="w-4 h-4 text-[#7d9b76]" />
                      Edit Exam/Assignment Portal
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingExamTarget(null)}
                      className="p-1 rounded-full hover:bg-slate-105 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleEditExamSubmit} className="space-y-4 pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Title</label>
                        <input
                          type="text"
                          required
                          value={editExamTitle}
                          onChange={(e) => setEditExamTitle(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Max Marks</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={editExamMaxMarks}
                          onChange={(e) => setEditExamMaxMarks(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deadline</label>
                        <input
                          type="datetime-local"
                          value={editExamDeadline}
                          onChange={(e) => setEditExamDeadline(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Attachment ({editExamAttachmentName || "None selected"})
                        </label>
                        <input
                          key={editExamFileInputKey}
                          type="file"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setEditExamAttachmentName(e.target.files[0].name);
                            }
                          }}
                          className="w-full h-9 px-3 py-1.5 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-800 bg-white file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-[#7d9b76] file:text-white file:cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Instructions / Questions</label>
                      <textarea
                        rows={4}
                        value={editExamQuestions}
                        onChange={(e) => setEditExamQuestions(e.target.value)}
                        className="w-full p-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-xs text-slate-850 bg-white resize-none font-semibold"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingExamTarget(null)}
                        className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#7d9b76] hover:bg-[#6c8766] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm animate-none"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>


          {/* PROJECT GRADING MODAL */}
          <AnimatePresence>
            {gradingTarget && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-[#dce5d4] p-6 shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-display text-base font-bold text-slate-800">
                      {gradingTarget.type === "member" ? "Grade Student Project" : "Grade Team Project"}
                    </h3>
                    <button
                      onClick={() => setGradingTarget(null)}
                      className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleProjectGradeSubmit} className="py-4 space-y-4">
                    <div className="p-3 bg-[#faf8f3] rounded-xl border border-[#dce5d4]/40 text-xs font-semibold text-slate-700">
                      Grading: <span className="font-bold text-slate-800">{gradingTarget.name}</span> 
                      {gradingTarget.type === "team" && <span className="text-[10px] text-amber-600 block mt-1">This will update project grades for all members of the team.</span>}
                    </div>

                    {/* Component Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Grade Name / Component *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Update 1, Viva, Final Presentation"
                        value={gradeComponentName}
                        onChange={(e) => setGradeComponentName(e.target.value)}
                        className="w-full h-9 px-3 border border-[#dce5d4] rounded-xl text-xs bg-[#faf8f3] focus:outline-none focus:ring-1 focus:ring-[#7d9b76]"
                      />
                      <div className="flex gap-1.5 flex-wrap pt-1.5">
                        {["Update 1", "Viva 1", "Final Update", "Report"].map((sugg) => (
                          <button
                            key={sugg}
                            type="button"
                            onClick={() => setGradeComponentName(sugg)}
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[9px] font-semibold text-slate-500 cursor-pointer"
                          >
                            {sugg}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Marks Obtained & Max Marks */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Marks Obtained *
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          required
                          value={gradeObtained}
                          onChange={(e) => setGradeObtained(e.target.value)}
                          className="w-full h-9 px-3 border border-[#dce5d4] rounded-xl text-xs font-mono font-bold bg-[#faf8f3] focus:outline-none focus:ring-1 focus:ring-[#7d9b76]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Max Marks *
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          required
                          value={gradeMax}
                          onChange={(e) => setGradeMax(e.target.value)}
                          className="w-full h-9 px-3 border border-[#dce5d4] rounded-xl text-xs font-mono font-bold bg-[#faf8f3] focus:outline-none focus:ring-1 focus:ring-[#7d9b76]"
                        />
                      </div>
                    </div>

                    {/* Feedback */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Feedback Notes (Optional)
                      </label>
                      <textarea
                        placeholder="Good teamwork, normalization is solid..."
                        value={gradeFeedback}
                        onChange={(e) => setGradeFeedback(e.target.value)}
                        rows={3}
                        className="w-full p-3 border border-[#dce5d4] rounded-xl text-xs bg-[#faf8f3] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] resize-none"
                      />
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setGradingTarget(null)}
                        className="px-4 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-full bg-[#7d9b76] text-white text-xs font-semibold hover:bg-[#6b8865] transition cursor-pointer"
                      >
                        Submit Grade
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* CREATE TEAM MANUALLY MODAL */}
          <AnimatePresence>
            {isCreateTeamOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-[#dce5d4] p-6 shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                    <h3 className="font-display text-base font-bold text-slate-800">
                      Create Course Project Team
                    </h3>
                    <button
                      onClick={() => setIsCreateTeamOpen(false)}
                      className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateTeamSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                    {/* Team Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Team Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Hexa Coders"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        className="w-full h-9 px-3 border border-[#dce5d4] rounded-xl text-xs bg-[#faf8f3] focus:outline-none focus:ring-1 focus:ring-[#7d9b76]"
                      />
                    </div>

                    {/* Leader Select */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Select Team Leader *
                      </label>
                      <AppSelect
                        size="sm"
                        value={newTeamLeaderEmail}
                        onValueChange={(val) => {
                          setNewTeamLeaderEmail(val);
                          setNewTeamMembersEmails((prev) =>
                            prev.filter((email) => email !== val)
                          );
                        }}
                        placeholder="Select student"
                        options={[
                          { value: "", label: "Select student" },
                          ...unassignedStudents.map((s) => ({
                            value: s.email,
                            label: `${s.name} (${s.id})`,
                          })),
                        ]}
                      />
                    </div>

                    {/* Members Checkboxes */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Select Team Members
                        <span className="ml-2 text-slate-500 font-semibold normal-case">
                          (Team size: {newTeamLeaderEmail ? 1 + newTeamMembersEmails.length : 0})
                        </span>
                      </label>
                      
                      <div className="border border-[#dce5d4] rounded-xl p-3 bg-[#faf8f3] max-h-44 overflow-y-auto space-y-2">
                        {unassignedStudents
                          .filter(s => s.email !== newTeamLeaderEmail)
                          .map((student) => {
                            const isChecked = newTeamMembersEmails.includes(student.email);
                            return (
                              <label key={student.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setNewTeamMembersEmails(prev => prev.filter(e => e !== student.email));
                                    } else {
                                      setNewTeamMembersEmails(prev => [...prev, student.email]);
                                    }
                                  }}
                                  className="rounded text-[#7d9b76] focus:ring-[#7d9b76]"
                                />
                                <span>{student.name} ({student.id})</span>
                              </label>
                            );
                          })}
                        
                        {unassignedStudents.filter(s => s.email !== newTeamLeaderEmail).length === 0 && (
                          <p className="text-[10px] text-slate-400 italic text-center py-4">No other unassigned students available.</p>
                        )}
                      </div>
                    </div>

                    {/* Submit Bar */}
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsCreateTeamOpen(false)}
                        className="px-4 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-full bg-[#7d9b76] text-white text-xs font-semibold hover:bg-[#6b8865] transition cursor-pointer"
                      >
                        Create Team
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* EDIT TEAM MODAL */}
          <AnimatePresence>
            {editingTeamTarget && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-[#dce5d4] p-6 shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                    <h3 className="font-display text-base font-bold text-slate-800">
                      Edit Project Team: {editingTeamTarget.teamName}
                    </h3>
                    <button
                      onClick={() => setEditingTeamTarget(null)}
                      className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleEditTeamSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                    {/* Team Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Team Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Hexa Coders"
                        value={editTeamName}
                        onChange={(e) => setEditTeamName(e.target.value)}
                        className="w-full h-9 px-3 border border-[#dce5d4] rounded-xl text-xs bg-[#faf8f3] focus:outline-none focus:ring-1 focus:ring-[#7d9b76]"
                      />
                    </div>

                    {/* Team Leader Select */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Select Team Leader *
                      </label>
                      <AppSelect
                        size="sm"
                        value={editTeamLeaderEmail}
                        onValueChange={setEditTeamLeaderEmail}
                        placeholder="Select team leader"
                        options={[
                          { value: "", label: "Select team leader" },
                          ...editTeamMembersEmails.map((email) => {
                            const student = students.find(
                              (s) =>
                                s.email.trim().toLowerCase() ===
                                email.trim().toLowerCase()
                            );
                            return {
                              value: email,
                              label: `${student?.name || email} (${student?.id || "Member"})`,
                            };
                          }),
                        ]}
                      />
                    </div>

                    {/* Current Members List */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Current Team Members ({editTeamMembersEmails.length})
                      </label>
                      <div className="border border-[#dce5d4] rounded-xl p-3 bg-[#faf8f3] max-h-44 overflow-y-auto space-y-2">
                        {editTeamMembersEmails.map((email) => {
                          const cleanEmail = email.trim().toLowerCase();
                          const isLeader = cleanEmail === editTeamLeaderEmail.trim().toLowerCase();
                          const student = students.find(s => s.email.trim().toLowerCase() === cleanEmail);
                          const canRemove = !isLeader && editTeamMembersEmails.length > 1;

                          return (
                            <div key={email} className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700 bg-white border border-[#dce5d4]/40 p-2 rounded-lg">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {isLeader && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                                <span className="truncate">{student?.name || email} ({student?.id || "Invited"})</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveMemberFromEditState(email)}
                                disabled={!canRemove}
                                className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer transition shrink-0"
                                title={isLeader ? "Cannot remove the leader" : editTeamMembersEmails.length <= 1 ? "A team must have at least one member" : "Remove member"}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                        {editTeamMembersEmails.length === 0 && (
                          <p className="text-[10px] text-slate-400 italic text-center py-4">No members in this team.</p>
                        )}
                      </div>
                    </div>

                    {/* Add Member section */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Add New Member
                      </label>
                      <div className="flex items-center gap-2">
                        <AppSelect
                          size="sm"
                          className="flex-1"
                          value={editSelectedUnassignedEmail}
                          onValueChange={setEditSelectedUnassignedEmail}
                          placeholder="Select student to add"
                          options={[
                            { value: "", label: "Select student to add" },
                            ...availableToEditAdd.map((s) => ({
                              value: s.email,
                              label: `${s.name} (${s.id})`,
                            })),
                          ]}
                        />
                        <button
                          type="button"
                          onClick={handleAddMemberToEditState}
                          disabled={!editSelectedUnassignedEmail}
                          className="h-9 px-4 rounded-xl bg-[#7d9b76] hover:bg-[#6b8865] text-white text-xs font-bold disabled:opacity-40 cursor-pointer transition"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Submit Bar */}
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingTeamTarget(null)}
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

        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString();
}
