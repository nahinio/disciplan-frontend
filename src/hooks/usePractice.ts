import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { mapPastPaper, mapPracticeProblem, mapPracticeTopic } from "@/lib/mappers";
import { queryKeys } from "@/lib/queryKeys";
import type { PastPaperItem } from "@/lib/mappers";

export function usePracticeTopics(courseCode: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.practice.topics(courseCode),
    queryFn: async () => {
      const res = await api.getPracticeTopics(courseCode);
      const items = res.items as Record<string, unknown>[];
      return items.map((row) => mapPracticeTopic(row));
    },
    enabled: Boolean(courseCode),
  });

  const refresh = useCallback(async () => {
    if (!courseCode) return;
    await qc.invalidateQueries({ queryKey: queryKeys.practice.topics(courseCode) });
  }, [qc, courseCode]);

  return {
    topics: query.data ?? [],
    loading: query.isPending,
    refresh,
  };
}

export function usePracticeProblems(
  courseCode: string,
  topicId: string | null,
  enabled: boolean
) {
  const qc = useQueryClient();
  const topicNum = topicId ? Number(topicId) : null;

  const query = useQuery({
    queryKey: queryKeys.practice.problems(courseCode, topicNum),
    queryFn: async () => {
      const res = await api.getPracticeProblems(courseCode, {
        topic_id: topicNum!,
      });
      return (res.items as Record<string, unknown>[]).map(mapPracticeProblem);
    },
    enabled: enabled && Boolean(courseCode) && topicNum != null && Number.isFinite(topicNum),
  });

  const refresh = useCallback(async () => {
    if (!courseCode) return;
    await qc.invalidateQueries({
      queryKey: queryKeys.practice.problems(courseCode, topicNum),
    });
  }, [qc, courseCode, topicNum]);

  return {
    problems: query.data ?? [],
    loading: query.isPending,
    refresh,
  };
}

export function usePastPapers(courseCode: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.practice.pastPapers(courseCode),
    queryFn: async () => {
      const res = await api.getPracticePastPapers(courseCode);
      return (res.items as Record<string, unknown>[]).map(mapPastPaper);
    },
    enabled: Boolean(courseCode),
  });

  const refresh = useCallback(async () => {
    if (!courseCode) return;
    await qc.invalidateQueries({ queryKey: queryKeys.practice.pastPapers(courseCode) });
  }, [qc, courseCode]);

  return {
    papers: query.data ?? [],
    loading: query.isPending,
    refresh,
  };
}
