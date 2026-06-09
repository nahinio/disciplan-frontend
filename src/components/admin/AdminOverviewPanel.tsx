import { BookOpen, Layers, Users, Megaphone, RefreshCw } from "lucide-react";
import type { useAdmin } from "@/hooks/useAdmin";
import { AdminLoading, AdminPageHeader, EmptyState, StatCard, adminBtnSecondary, adminCard } from "./admin-ui";

type AdminData = ReturnType<typeof useAdmin>;

export function AdminOverviewPanel({ admin }: { admin: AdminData }) {
  const { activity, auditLogs, topCourses, loading, refresh } = admin;

  if (loading && !activity) return <AdminLoading />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Analytics & oversight"
        title="System overview"
        description="Platform health, audit trail, and engagement at a glance."
        actions={
          <button type="button" onClick={() => void refresh()} className={adminBtnSecondary}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Courses" value={activity?.active_courses ?? 0} icon={<BookOpen className="w-5 h-5" />} />
        <StatCard label="Sections" value={admin.sections.length} icon={<Layers className="w-5 h-5" />} />
        <StatCard label="Users" value={activity?.total_users ?? 0} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Blog posts" value={activity?.blog_posts ?? 0} icon={<Megaphone className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={adminCard + " p-5"}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Platform activity</h3>
          {activity ? (
            <div className="space-y-2 text-sm">
              {[
                ["Forum threads", activity.forum_threads],
                ["Submissions", activity.submissions],
              ].map(([label, val]) => (
                <div key={String(label)} className="flex justify-between font-medium">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-slate-800 font-bold tabular-nums">{val}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No activity data." />
          )}
        </div>

        <div className={adminCard + " p-5"}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Top courses</h3>
          {topCourses.length === 0 ? (
            <EmptyState message="No enrollment data yet." />
          ) : (
            <div className="space-y-2">
              {topCourses.map((c) => (
                <div key={c.code} className="flex justify-between text-sm font-medium">
                  <span className="text-slate-700 truncate pr-3">
                    {c.code} — {c.title}
                  </span>
                  <span className="text-slate-500 shrink-0">{c.enrollments} enrolled</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={adminCard + " p-5"}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Audit log</h3>
        {auditLogs.length === 0 ? (
          <EmptyState message="No audit events recorded yet." />
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2 text-xs font-mono">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-2 rounded-lg bg-[#f5f8f2] text-slate-700">
                <span className="text-slate-400">[{new Date(log.timestamp).toLocaleString()}]</span>{" "}
                <span className="font-bold text-rose-700">{log.action}</span> — {log.user}
                {log.details ? <span className="text-slate-500"> — {log.details}</span> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
