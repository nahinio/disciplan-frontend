import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { invalidateCourseContent } from "@/lib/invalidateAppData";
import { queryKeys } from "@/lib/queryKeys";

export interface SectionPracticeItem {
  id: number;
  question: string;
  answer: string;
  term: string;
  scope: "course" | "section";
  difficulty_score: number;
}

function mapPracticeRow(row: Record<string, unknown>): SectionPracticeItem {
  return {
    id: Number(row.id),
    question: String(row.question ?? row.title ?? ""),
    answer: String(row.answer ?? ""),
    term: String(row.term ?? "mid"),
    scope: row.section_id == null || row.scope === "course" ? "course" : "section",
    difficulty_score: Number(row.difficulty_score ?? 3),
  };
}

export function useSectionPractice(courseCode: string, sectionLabel: string) {
  const qc = useQueryClient();
  const practiceKey = queryKeys.section.practice(courseCode, sectionLabel);

  const query = useQuery({
    queryKey: practiceKey,
    queryFn: async () => {
      const res = await api.getSectionPracticeProblems(courseCode, sectionLabel);
      return (res.items as Record<string, unknown>[]).map(mapPracticeRow);
    },
    enabled: Boolean(courseCode && sectionLabel),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const refetchPractice = useCallback(async () => {
    await qc.refetchQueries({ queryKey: practiceKey });
  }, [qc, practiceKey]);

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.createSectionPracticeProblem(courseCode, sectionLabel, body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: practiceKey });
      const previous = qc.getQueryData<SectionPracticeItem[]>(practiceKey);
      const optimistic: SectionPracticeItem = {
        id: -Date.now(),
        question: String(body.question ?? ""),
        answer: String(body.answer ?? ""),
        term: String(body.assessment_type_code ?? "mid"),
        scope: "section",
        difficulty_score: Number(body.difficulty_score ?? 3),
      };
      qc.setQueryData<SectionPracticeItem[]>(practiceKey, (old = []) => [optimistic, ...old]);
      return { previous };
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.previous) qc.setQueryData(practiceKey, ctx.previous);
    },
    onSettled: async () => {
      invalidateCourseContent(qc, courseCode);
      await refetchPractice();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteSectionPracticeProblem(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: practiceKey });
      const previous = qc.getQueryData<SectionPracticeItem[]>(practiceKey);
      qc.setQueryData<SectionPracticeItem[]>(practiceKey, (old = []) =>
        old.filter((p) => p.id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(practiceKey, ctx.previous);
    },
    onSettled: async () => {
      invalidateCourseContent(qc, courseCode);
      await refetchPractice();
    },
  });

  const refresh = useCallback(async () => {
    await refetchPractice();
  }, [refetchPractice]);

  return {
    problems: query.data ?? [],
    loading: query.isPending,
    isFetching: query.isFetching,
    refresh,
    createProblem: async (body: Record<string, unknown>) => {
      await createMutation.mutateAsync(body);
    },
    deleteProblem: async (id: number) => {
      await deleteMutation.mutateAsync(id);
    },
  };
}
