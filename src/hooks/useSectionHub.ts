import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { invalidatePlannerData, invalidateSectionHub } from "@/lib/invalidateAppData";
import { queryKeys } from "@/lib/queryKeys";
import { initialsFromName } from "@/lib/offerings";
import type { SectionAnnouncement, SectionDoubt, SectionUser } from "@/data/mockSection";
import type { ExamAssignment, StudentSubmission } from "@/types/exam";

function mapUser(name: string, role: "student" | "faculty"): SectionUser {
  return { name, role, initials: initialsFromName(name) };
}

function mapAnnouncement(
  row: Record<string, unknown>,
  courseCode: string,
  section: string
): SectionAnnouncement {
  return {
    id: String(row.id),
    courseCode,
    section,
    title: String(row.title ?? ""),
    content: String(row.body ?? ""),
    author: mapUser(String(row.author_name ?? "Faculty"), "faculty"),
    createdAt: new Date(String(row.created_at ?? Date.now())),
    comments: [],
    pinned: Boolean(row.is_pinned),
    images: [],
  };
}

function mapDoubtListItem(
  row: Record<string, unknown>,
  courseCode: string,
  section: string
): SectionDoubt {
  const roleCode = String(row.author_role_code ?? "student");
  return {
    id: String(row.id),
    courseCode,
    section,
    question: String(row.title ?? ""),
    description: String(row.body ?? ""),
    author: mapUser(
      String(row.author_name ?? "Student"),
      roleCode === "faculty" ? "faculty" : "student"
    ),
    createdAt: new Date(String(row.created_at ?? Date.now())),
    answers: [],
    images: [],
    isVerified: Boolean(row.is_verified),
    answerCount: Number(row.answer_count ?? 0),
    authorUserId: row.author_user_id != null ? Number(row.author_user_id) : undefined,
  };
}

function mapPortalToExam(
  row: Record<string, unknown>,
  courseCode: string,
  section: string,
  submissions: StudentSubmission[] = []
): ExamAssignment {
  const closes = String(row.closes_at ?? "");
  return {
    id: String(row.id),
    courseCode,
    section,
    title: String(row.title ?? ""),
    deadline: closes ? closes.slice(0, 16) : "",
    questions: String(row.description ?? ""),
    maxMarks: Number(row.max_score ?? 100),
    submissions,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

interface SectionHubData {
  announcements: SectionAnnouncement[];
  doubts: SectionDoubt[];
  exams: ExamAssignment[];
}

async function fetchSectionHub(
  courseCode: string,
  sectionLabel: string
): Promise<SectionHubData> {
  const [annRes, doubtRes, portalRes] = await Promise.all([
    api.getSectionAnnouncements(courseCode, sectionLabel),
    api.getSectionDoubts(courseCode, sectionLabel),
    api.getAssessmentPortals(courseCode, sectionLabel),
  ]);

  const annItems = (annRes.items as Record<string, unknown>[]).map((r) =>
    mapAnnouncement(r, courseCode, sectionLabel)
  );
  annItems.sort((a, b) => {
    const pin = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    if (pin !== 0) return pin;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const doubts = (doubtRes.items as Record<string, unknown>[]).map((r) =>
    mapDoubtListItem(r, courseCode, sectionLabel)
  );

  const portals = portalRes.items as Record<string, unknown>[];
  const examList: ExamAssignment[] = [];
  for (const p of portals) {
    let subs: StudentSubmission[] = [];
    try {
      const subRes = await api.getPortalSubmissions(Number(p.id));
      subs = (subRes.items as Record<string, unknown>[]).map((s) => ({
        id: Number(s.id),
        studentId: String(s.student_id ?? ""),
        studentName: String(s.student_name ?? ""),
        studentEmail: String(s.student_email ?? ""),
        submittedFile: String(s.submitted_file ?? ""),
        submittedAt: String(s.submitted_at ?? ""),
        marksObtained: s.marks_obtained != null ? Number(s.marks_obtained) : undefined,
        maxMarks: Number(s.max_marks ?? p.max_score ?? 100),
        feedback: s.feedback ? String(s.feedback) : undefined,
        gradedAt: s.graded_at ? String(s.graded_at) : undefined,
        fileUrl: s.file_url ? String(s.file_url) : undefined,
      }));
    } catch {
      try {
        const detail = await api.getAssessmentPortal(Number(p.id));
        const my = detail.my_submission as Record<string, unknown> | null | undefined;
        if (my) {
          subs = [
            {
              id: Number(my.id),
              studentId: "",
              studentName: "",
              studentEmail: "",
              submittedFile: String(my.submitted_file ?? ""),
              submittedAt: String(my.submitted_at ?? ""),
              marksObtained: my.score != null ? Number(my.score) : undefined,
              maxMarks: Number(p.max_score ?? 100),
              feedback: my.feedback ? String(my.feedback) : undefined,
              gradedAt: my.graded_at ? String(my.graded_at) : undefined,
              fileUrl: my.file_url ? String(my.file_url) : undefined,
            },
          ];
        }
      } catch {
        /* no access */
      }
    }
    examList.push(mapPortalToExam(p, courseCode, sectionLabel, subs));
  }

  return { announcements: annItems, doubts, exams: examList };
}

export function useSectionHub(courseCode: string, sectionLabel: string) {
  const qc = useQueryClient();
  const hubKey = queryKeys.section.hub(courseCode, sectionLabel);

  const query = useQuery({
    queryKey: hubKey,
    queryFn: () => fetchSectionHub(courseCode, sectionLabel),
    enabled: Boolean(courseCode && sectionLabel),
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

  const invalidate = useCallback(async () => {
    invalidateSectionHub(qc, courseCode, sectionLabel);
    invalidatePlannerData(qc);
    await qc.refetchQueries({ queryKey: hubKey });
  }, [qc, courseCode, sectionLabel, hubKey]);

  const hubMutation = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      void invalidate();
    },
  });

  const refresh = useCallback(
    async (_opts?: { silent?: boolean }) => {
      await qc.refetchQueries({ queryKey: hubKey });
    },
    [qc, hubKey]
  );

  const loadDoubtDetail = useCallback(
    async (doubtId: string): Promise<SectionDoubt | null> => {
      try {
        const detail = await api.getDoubt(Number(doubtId));
        const acceptedId =
          detail.accepted_answer_id != null ? String(detail.accepted_answer_id) : null;
        const answers = (detail.answers as Record<string, unknown>[]).map((a) => ({
          id: String(a.id),
          doubtId: doubtId,
          content: String(a.body ?? ""),
          author: mapUser(
            String(a.author_name ?? "User"),
            (a.author_role_code === "faculty" ? "faculty" : "student") as "student" | "faculty"
          ),
          isVerified: Boolean(a.is_faculty_answer),
          isEndorsed: Boolean(a.is_faculty_endorsed),
          isOfficial: acceptedId != null && String(a.id) === acceptedId,
          createdAt: new Date(String(a.created_at ?? Date.now())),
        }));
        return {
          id: doubtId,
          courseCode,
          section: sectionLabel,
          question: String(detail.title ?? ""),
          description: String(detail.body ?? ""),
          author: mapUser(String(detail.author_name ?? "Student"), "student"),
          createdAt: new Date(String(detail.created_at ?? Date.now())),
          answers,
          images: [],
          isVerified: Boolean(detail.is_verified),
          acceptedAnswerId: acceptedId,
          authorUserId: detail.author_user_id != null ? Number(detail.author_user_id) : undefined,
        };
      } catch {
        return null;
      }
    },
    [courseCode, sectionLabel]
  );

  const run = (fn: () => Promise<unknown>) => hubMutation.mutateAsync(fn);

  return {
    announcements: query.data?.announcements ?? [],
    doubts: query.data?.doubts ?? [],
    exams: query.data?.exams ?? [],
    loading: query.isPending,
    refresh,
    loadDoubtDetail,
    createAnnouncement: async (title: string, body: string, pinned = false) => {
      await run(() =>
        api.createSectionAnnouncement(courseCode, sectionLabel, {
          title,
          body,
          is_pinned: pinned,
        })
      );
    },
    createDoubt: async (title: string, body: string) => {
      await run(() => api.createSectionDoubt(courseCode, sectionLabel, { title, body }));
    },
    answerDoubt: async (doubtId: number, body: string, parentAnswerId?: number) => {
      await run(() =>
        api.answerDoubt(doubtId, { body, parent_answer_id: parentAnswerId ?? null })
      );
    },
    createExamPortal: async (payload: {
      title: string;
      description: string;
      opens_at: string;
      closes_at: string;
      max_score: number;
    }) => {
      await run(() => api.createAssessmentPortal(courseCode, sectionLabel, payload));
    },
    submitExam: async (portalId: number, fileId: number) => {
      await run(() => api.submitAssessment(portalId, fileId));
    },
    gradeSubmission: async (submissionId: number, score: number, feedback?: string) => {
      await run(() => api.gradeSubmission(submissionId, score, feedback));
    },
    pinAnnouncement: async (announcementId: number, pinned: boolean) => {
      await run(() => api.updateSectionAnnouncement(announcementId, { is_pinned: pinned }));
    },
    deleteAnnouncement: async (announcementId: string) => {
      await run(() => api.deleteSectionAnnouncement(Number(announcementId)));
    },
    deleteDoubt: async (doubtId: string) => {
      await run(() => api.deleteSectionDoubt(Number(doubtId)));
    },
    updateExamPortal: async (
      portalId: number,
      payload: {
        title: string;
        description: string;
        opens_at: string;
        closes_at: string;
        max_score: number;
      }
    ) => {
      await run(() => api.updateAssessmentPortal(portalId, payload));
    },
    deleteExamPortal: async (portalId: number) => {
      await run(() => api.deleteAssessmentPortal(portalId));
    },
  };
}
