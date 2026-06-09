import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export interface SectionResource {
  id: number;
  title: string;
  description?: string;
  resource_kind: "file" | "link";
  external_url?: string;
  mime_category: string;
  file_id?: number;
  file_url?: string;
  mime_type?: string;
  original_filename?: string;
  created_at: string;
}

function mapResourceRow(r: Record<string, unknown>): SectionResource {
  return {
    id: Number(r.id),
    title: String(r.title ?? ""),
    description: r.description ? String(r.description) : undefined,
    resource_kind: (r.resource_kind as "file" | "link") ?? "file",
    external_url: r.external_url ? String(r.external_url) : undefined,
    mime_category: String(r.mime_category ?? "other"),
    file_id: r.file_id != null ? Number(r.file_id) : undefined,
    file_url: r.file_url ? String(r.file_url) : undefined,
    mime_type: r.mime_type ? String(r.mime_type) : undefined,
    original_filename: r.original_filename ? String(r.original_filename) : undefined,
    created_at: String(r.created_at ?? ""),
  };
}

export function useSectionResources(courseCode: string, sectionLabel: string) {
  const qc = useQueryClient();
  const hubKey = queryKeys.section.resources(courseCode, sectionLabel);

  const query = useQuery({
    queryKey: hubKey,
    queryFn: async () => {
      const res = await api.getSectionResources(courseCode, sectionLabel);
      return (res.items as Record<string, unknown>[]).map(mapResourceRow);
    },
    enabled: Boolean(courseCode && sectionLabel),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const refetchResources = useCallback(async () => {
    await qc.refetchQueries({ queryKey: hubKey });
  }, [qc, hubKey]);

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.createSectionResource(courseCode, sectionLabel, body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: hubKey });
      const previous = qc.getQueryData<SectionResource[]>(hubKey);
      const optimistic: SectionResource = {
        id: -Date.now(),
        title: String(body.title ?? "New resource"),
        description: body.description ? String(body.description) : undefined,
        resource_kind: (body.resource_kind as "file" | "link") ?? "file",
        external_url: body.external_url ? String(body.external_url) : undefined,
        mime_category: String(body.mime_category ?? "other"),
        file_id: body.file_id != null ? Number(body.file_id) : undefined,
        created_at: new Date().toISOString(),
      };
      qc.setQueryData<SectionResource[]>(hubKey, (old = []) => [optimistic, ...old]);
      return { previous };
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.previous) qc.setQueryData(hubKey, ctx.previous);
    },
    onSettled: async () => {
      await refetchResources();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteSectionResource(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: hubKey });
      const previous = qc.getQueryData<SectionResource[]>(hubKey);
      qc.setQueryData<SectionResource[]>(hubKey, (old = []) => old.filter((r) => r.id !== id));
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(hubKey, ctx.previous);
    },
    onSettled: async () => {
      await refetchResources();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.updateSectionResource(id, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: hubKey });
      const previous = qc.getQueryData<SectionResource[]>(hubKey);
      qc.setQueryData<SectionResource[]>(hubKey, (old = []) =>
        old.map((r) =>
          r.id === id
            ? {
                ...r,
                title: body.title != null ? String(body.title) : r.title,
                external_url:
                  body.external_url != null ? String(body.external_url) : r.external_url,
                description:
                  body.description != null ? String(body.description) : r.description,
              }
            : r
        )
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(hubKey, ctx.previous);
    },
    onSettled: async () => {
      await refetchResources();
    },
  });

  const refresh = useCallback(async () => {
    await refetchResources();
  }, [refetchResources]);

  return {
    resources: query.data ?? [],
    loading: query.isPending,
    isFetching: query.isFetching,
    refresh,
    createResource: async (body: Record<string, unknown>) => {
      await createMutation.mutateAsync(body);
    },
    deleteResource: async (id: number) => {
      await deleteMutation.mutateAsync(id);
    },
    updateResource: async (id: number, body: Record<string, unknown>) => {
      await updateMutation.mutateAsync({ id, body });
    },
  };
}
