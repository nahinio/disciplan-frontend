import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { RefreshButton } from "@/components/ui/refresh-button";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { Flag, Pencil, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { invalidateCourseContent, invalidateForumData } from "@/lib/invalidateAppData";
import { mapBlogPostDetail } from "@/lib/mappers";
import type { BlogPost } from "@/data/mockBlog";
import type { useAdmin } from "@/hooks/useAdmin";
import {
  AdminLoading,
  AdminPageHeader,
  EmptyState,
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminInput,
  adminSelect,
  adminTextarea,
} from "./admin-ui";
import { AppSelect } from "@/components/ui/app-select";

type AdminData = ReturnType<typeof useAdmin>;
type Tab = "blogs" | "blog_posts" | "blog_comments" | "forum_posts";

const TABS: { id: Tab; label: string; entityTypes?: string[] }[] = [
  { id: "blogs", label: "All blogs" },
  { id: "blog_posts", label: "Reported blogs", entityTypes: ["blog_post"] },
  {
    id: "blog_comments",
    label: "Reported comments",
    entityTypes: ["blog_comment", "forum_reply"],
  },
  { id: "forum_posts", label: "Reported forum posts", entityTypes: ["forum_thread"] },
];

interface ContentReport {
  id: number;
  entity_id: number;
  entity_type_code: string;
  reason_code: string;
  reason_label: string;
  notes: string | null;
  created_at: string;
  reporter_name: string;
  preview_title?: string;
  preview_body?: string;
  course_code?: string;
  content_author?: string;
}

export function AdminModerationPanel({ admin }: { admin: AdminData }) {
  const qc = useQueryClient();
  const { courses, loading, deleteBlog, updateBlog } = admin;
  const [tab, setTab] = useState<Tab>("blogs");

  const [filterCourse, setFilterCourse] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editExcerpt, setEditExcerpt] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const activeTabMeta = TABS.find((x) => x.id === tab);
  const reportEntityTypes = activeTabMeta?.entityTypes?.join(",") ?? "";

  const blogsQuery = useQuery({
    queryKey: queryKeys.admin.blogs(filterCourse, appliedQuery),
    queryFn: async () => {
      const res = await api.adminListBlogs({
        course_code: filterCourse || undefined,
        q: appliedQuery.trim() || undefined,
        limit: 100,
      });
      return (res.items as Record<string, unknown>[]).map((row) => mapBlogPostDetail(row));
    },
    enabled: tab === "blogs",
  });

  const reportsQuery = useQuery({
    queryKey: queryKeys.admin.reports(reportEntityTypes),
    queryFn: async () => {
      const res = await api.adminListContentReports({
        status: "open",
        entity_types: reportEntityTypes,
        limit: 100,
      });
      return (res.items as Record<string, unknown>[]).map((r) => ({
        id: Number(r.id),
        entity_id: Number(r.entity_id),
        entity_type_code: String(r.entity_type_code),
        reason_code: String(r.reason_code),
        reason_label: String(r.reason_label ?? r.reason_code),
        notes: r.notes != null ? String(r.notes) : null,
        created_at: String(r.created_at ?? ""),
        reporter_name: String(r.reporter_name ?? "Unknown"),
        preview_title: r.preview_title ? String(r.preview_title) : undefined,
        preview_body: r.preview_body ? String(r.preview_body) : undefined,
        course_code: r.course_code ? String(r.course_code) : undefined,
        content_author: r.content_author ? String(r.content_author) : undefined,
      })) as ContentReport[];
    },
    enabled: tab !== "blogs" && Boolean(reportEntityTypes),
  });

  const listBlogs = blogsQuery.data ?? [];
  const listLoading = blogsQuery.isPending;
  const reports = reportsQuery.data ?? [];
  const reportsLoading = reportsQuery.isPending;

  const refreshModeration = async () => {
    if (tab === "blogs") await blogsQuery.refetch();
    else await reportsQuery.refetch();
  };
  const { refresh: refreshPage, isRefreshing } = usePageRefresh(refreshModeration);

  const applyBlogFilters = () => setAppliedQuery(filterQuery);

  const resolveReport = async (
    report: ContentReport,
    action: "resolved" | "dismissed",
    deleteContent: boolean
  ) => {
    setResolvingId(report.id);
    try {
      await api.adminResolveContentReport(report.id, { action, delete_content: deleteContent });
      if (deleteContent) {
        if (report.entity_type_code === "forum_thread") {
          await invalidateForumData(qc, report.course_code);
        } else {
          await invalidateCourseContent(qc, report.course_code);
        }
      }
      toast.success(deleteContent ? "Content removed and report closed." : `Report ${action}.`);
      await reportsQuery.refetch();
    } catch {
      toast.error("Could not update report.");
    } finally {
      setResolvingId(null);
    }
  };

  const saveEdit = async (postId: string) => {
    if (!editTitle.trim() || !editBody.trim()) {
      toast.error("Title and body are required.");
      return;
    }
    setEditSaving(true);
    try {
      await updateBlog(postId, {
        title: editTitle.trim(),
        excerpt: editExcerpt.trim() || editTitle.trim().slice(0, 120),
        body_html: editBody.trim(),
      });
      toast.success("Blog updated.");
      setEditingId(null);
      await blogsQuery.refetch();
    } catch {
      toast.error("Could not update blog.");
    } finally {
      setEditSaving(false);
    }
  };

  if (loading && courses.length === 0) return <AdminLoading />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Trust & safety"
        title="Moderation"
        description="Review all blogs and act on reported comments and forum content."
        actions={<RefreshButton onClick={refreshPage} loading={isRefreshing} />}
      />

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? "px-4 py-2 rounded-full bg-rose-600 text-white text-xs font-bold"
                : "px-4 py-2 rounded-full border border-[#dce5d4] text-xs font-semibold text-slate-600 hover:border-[#7d9b76]"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "blogs" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <AppSelect
              className={adminSelect + " max-w-[220px]"}
              value={filterCourse}
              onValueChange={setFilterCourse}
              placeholder="All courses"
              options={[
                { value: "", label: "All courses" },
                ...courses.map((c) => ({ value: c.code, label: c.code })),
              ]}
            />
            <input
              className={adminInput + " max-w-xs"}
              placeholder="Search title or excerpt…"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyBlogFilters()}
            />
            <button type="button" className={adminBtnSecondary + " h-10 text-xs"} onClick={applyBlogFilters}>
              Apply
            </button>
          </div>

          {listLoading ? (
            <AdminLoading label="Loading blogs…" />
          ) : listBlogs.length === 0 ? (
            <EmptyState message="No blog posts found." />
          ) : (
            <div className={adminCard + " divide-y divide-[#eef2e8]"}>
              {listBlogs.map((post) => (
                <div key={post.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">{post.title}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {post.courseCode}
                        {post.topicTitle ? ` · ${post.topicTitle}` : ""} · {post.author.name} (
                        {post.author.role})
                      </p>
                      {post.excerpt && (
                        <p className="text-xs text-slate-600 mt-2 line-clamp-2">{post.excerpt}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (editingId === post.id) {
                            setEditingId(null);
                          } else {
                            setEditingId(post.id);
                            setEditTitle(post.title);
                            setEditExcerpt(post.excerpt);
                            setEditBody(post.body);
                          }
                        }}
                        className={adminBtnSecondary + " h-9 px-3"}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirm("Delete this blog post?")) return;
                          void deleteBlog(post.id)
                            .then(async () => {
                              toast.success("Post removed.");
                              await blogsQuery.refetch();
                            })
                            .catch(() => toast.error("Could not delete post."));
                        }}
                        className="h-9 px-3 rounded-xl border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {editingId === post.id && (
                    <div className="pt-3 border-t border-[#eef2e8] space-y-3 max-w-2xl">
                      <input
                        className={adminInput}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                      <input
                        className={adminInput}
                        value={editExcerpt}
                        onChange={(e) => setEditExcerpt(e.target.value)}
                      />
                      <textarea
                        className={adminTextarea}
                        rows={6}
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className={adminBtnPrimary}
                          disabled={editSaving}
                          onClick={() => void saveEdit(post.id)}
                        >
                          {editSaving ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          className={adminBtnSecondary}
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab !== "blogs" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5 text-rose-600" />
            Open reports — dismiss if fine, or delete the underlying content.
          </p>
          {reportsLoading ? (
            <AdminLoading label="Loading reports…" />
          ) : reports.length === 0 ? (
            <EmptyState message="No open reports in this queue." />
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className={adminCard + " p-4 space-y-3"}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                          <ShieldAlert className="w-3 h-3" />
                          {r.reason_label}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                          {r.entity_type_code === "forum_reply"
                            ? "Forum reply"
                            : r.entity_type_code === "blog_comment"
                              ? "Blog comment"
                              : r.entity_type_code.replace(/_/g, " ")}
                        </span>
                        {r.course_code && (
                          <span className="text-[10px] font-semibold text-slate-500">
                            {r.course_code}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-800 mt-2">
                        {r.preview_title ?? `Content #${r.entity_id}`}
                      </p>
                      {r.preview_body && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-3 whitespace-pre-wrap">
                          {r.preview_body}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 mt-2">
                        Reported by {r.reporter_name}
                        {r.content_author ? ` · Author: ${r.content_author}` : ""}
                        {r.notes ? ` · “${r.notes}”` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[#eef2e8]">
                    <button
                      type="button"
                      disabled={resolvingId === r.id}
                      onClick={() => void resolveReport(r, "dismissed", false)}
                      className={adminBtnSecondary + " h-9 text-xs"}
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      disabled={resolvingId === r.id}
                      onClick={() => {
                        if (!confirm("Delete this content permanently?")) return;
                        void resolveReport(r, "resolved", true);
                      }}
                      className="h-9 px-4 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
                    >
                      {resolvingId === r.id ? "…" : "Delete content"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
