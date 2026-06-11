import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { invalidateSectionHub } from "@/lib/invalidateAppData";
import { queryKeys } from "@/lib/queryKeys";
import type { ProjectGrade } from "@/data/mockSection";

export interface GradeRubricComponent {
  id: number;
  component_type: string;
  label: string;
  component_code: string;
  max_score: number;
  weight_percent: number;
  sort_order: number;
}

export interface CtScore {
  code: string;
  label: string;
  score: number | null;
  max: number;
}

export interface EvaluationScore {
  code: string;
  label: string;
  component_type: string;
  score: number | null;
  max: number;
  weight_percent: number;
}

export interface StudentGradeRow {
  id: string;
  name: string;
  email: string;
  ct_scores: CtScore[];
  ct_average: number | null;
  ct_max: number | null;
  evaluations: EvaluationScore[];
  total_percent: number;
  letter_grade: string;
  gpa_points: number;
  components: Record<string, unknown>[];
  ctMarks: number[];
  midMarks: number;
  attendance: number;
  overallStatus: "Excellent" | "Steady" | "Needs Attention" | "Critical Risk";
  projectGrades: ProjectGrade[];
}

function mapStudentRow(row: Record<string, unknown>): StudentGradeRow {
  const ctScores = (row.ct_scores as CtScore[]) ?? [];
  const ctMarks = ctScores.map((c) => Number(c.score ?? 0));
  while (ctMarks.length < 3) ctMarks.push(0);
  const evals = (row.evaluations as EvaluationScore[]) ?? [];
  const mid = evals.find((e) => e.label.toLowerCase().includes("mid"));
  const att = evals.find((e) => e.code === "attendance");
  const total = Number(row.total_percent ?? 0);
  const overallStatus =
    total >= 85
      ? "Excellent"
      : total >= 70
        ? "Steady"
        : total >= 55
          ? "Needs Attention"
          : "Critical Risk";
  const projectGrades: ProjectGrade[] = evals
    .filter((e) => e.component_type === "team" || e.component_type === "portal")
    .map((e) => ({
      componentName: e.label,
      marksObtained: Number(e.score ?? 0),
      maxMarks: e.max,
    }));
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    ct_scores: ctScores,
    ct_average: row.ct_average != null ? Number(row.ct_average) : null,
    ct_max: row.ct_max != null ? Number(row.ct_max) : null,
    evaluations: evals,
    total_percent: total,
    letter_grade: String(row.letter_grade ?? "—"),
    gpa_points: Number(row.gpa_points ?? 0),
    components: (row.components as Record<string, unknown>[]) ?? [],
    ctMarks: ctMarks.slice(0, 3),
    midMarks: Number(mid?.score ?? 0),
    attendance: Number(att?.score ?? 0),
    overallStatus,
    projectGrades,
  };
}

export function useSectionGrades(courseCode: string, sectionLabel: string) {
  const qc = useQueryClient();
  const gradesKey = queryKeys.section.grades(courseCode, sectionLabel);

  const query = useQuery({
    queryKey: gradesKey,
    queryFn: async () => {
      const [gradesRes, rubricRes] = await Promise.all([
        api.getSectionGrades(courseCode, sectionLabel),
        api.getGradeComponents(courseCode, sectionLabel),
      ]);
      const items = (gradesRes.items as Record<string, unknown>[]) ?? [];
      return {
        students: items.map(mapStudentRow),
        rubric: (rubricRes.items as GradeRubricComponent[]) ?? [],
      };
    },
    enabled: Boolean(courseCode && sectionLabel),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const invalidate = useCallback(async () => {
    invalidateSectionHub(qc, courseCode, sectionLabel);
    await qc.refetchQueries({ queryKey: gradesKey });
  }, [qc, gradesKey, courseCode, sectionLabel]);

  const gradeMutation = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      void invalidate();
    },
  });

  const refresh = useCallback(async () => {
    await qc.refetchQueries({ queryKey: gradesKey });
  }, [qc, gradesKey]);

  const students = query.data?.students ?? [];
  const rubric = query.data?.rubric ?? [];

  const saveComponentGrade = async (
    studentId: number,
    componentCode: string,
    score: number,
    maxScore: number,
    feedback?: string
  ) => {
    await gradeMutation.mutateAsync(() =>
      api.upsertSectionGrade(courseCode, sectionLabel, studentId, {
        component_code: componentCode,
        score,
        max_score: maxScore,
        feedback,
      })
    );
  };

  return {
    students,
    rubric,
    loading: query.isPending,
    refresh,
    addComponent: async (body: {
      component_type: string;
      label: string;
      max_score: number;
      weight_percent: number;
      component_code?: string;
    }) => {
      await gradeMutation.mutateAsync(() =>
        api.createGradeComponent(courseCode, sectionLabel, body)
      );
    },
    deleteComponent: async (componentId: number) => {
      await gradeMutation.mutateAsync(() =>
        api.deleteGradeComponent(componentId)
      );
    },
    updateComponent: async (
      componentId: number,
      body: {
        label?: string;
        max_score?: number;
        weight_percent?: number;
        sort_order?: number;
        is_active?: boolean;
      }
    ) => {
      await gradeMutation.mutateAsync(() =>
        api.updateGradeComponent(componentId, body)
      );
    },
    saveComponentGrade,
    saveProjectGrade: async (
      studentId: number,
      componentName: string,
      marksObtained: number,
      maxMarks: number
    ) => {
      const code = componentName.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30);
      await saveComponentGrade(studentId, code, marksObtained, maxMarks);
    },
    saveStudentGrades: async (
      studentId: number,
      data: { ctMarks: number[]; midMarks: number; attendance?: number }
    ) => {
      const ctComps = rubric.filter((c) => c.component_type === "ct");
      for (let i = 0; i < ctComps.length; i++) {
        await saveComponentGrade(
          studentId,
          ctComps[i].component_code,
          data.ctMarks[i] ?? 0,
          ctComps[i].max_score
        );
      }
      const midComp = rubric.find((c) => c.label.toLowerCase().includes("mid"));
      if (midComp) {
        await saveComponentGrade(studentId, midComp.component_code, data.midMarks, midComp.max_score);
      }
      if (data.attendance != null) {
        const att = rubric.find((c) => c.component_code === "attendance");
        if (att) {
          await saveComponentGrade(studentId, att.component_code, data.attendance, att.max_score);
        }
      }
    },
  };
}
