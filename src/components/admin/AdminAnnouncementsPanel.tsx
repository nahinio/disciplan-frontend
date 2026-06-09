import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { GlobalAnnouncement } from "@/hooks/useAdmin";
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

export function AdminAnnouncementsPanel({ admin }: { admin: AdminData }) {
  const { globalAnnouncements, loading, createAnnouncement, updateAnnouncement, deleteAnnouncement } = admin;
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<GlobalAnnouncement["targetAudience"]>("all");

  const resetForm = () => {
    setTitle("");
    setContent("");
    setAudience("all");
    setEditingId(null);
    setOpen(false);
  };

  const startEdit = (ann: GlobalAnnouncement) => {
    setEditingId(ann.id);
    setTitle(ann.title);
    setContent(ann.content);
    setAudience(ann.targetAudience ?? "all");
    setOpen(true);
  };

  const submit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and message are required.");
      return;
    }
    try {
      if (editingId) {
        await updateAnnouncement(editingId, {
          title: title.trim(),
          body: content.trim(),
        });
        toast.success("Announcement updated.");
      } else {
        await createAnnouncement({
          id: "",
          title: title.trim(),
          content: content.trim(),
          createdAt: new Date().toISOString(),
          active: true,
          authorName: "Administrator",
          targetAudience: audience,
        });
        toast.success("Announcement broadcast created.");
      }
      resetForm();
    } catch {
      toast.error("Could not save announcement.");
    }
  };

  const toggleActive = async (ann: GlobalAnnouncement) => {
    try {
      await updateAnnouncement(ann.id, { is_active: !ann.active });
      toast.success(ann.active ? "Announcement deactivated." : "Announcement activated.");
    } catch {
      toast.error("Could not update status.");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this announcement permanently?")) return;
    try {
      await deleteAnnouncement(id);
      toast.success("Announcement deleted.");
    } catch {
      toast.error("Could not delete announcement.");
    }
  };

  if (loading && globalAnnouncements.length === 0) return <AdminLoading />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Platform communication"
        title="System announcements"
        description="Send global or targeted broadcasts to students and faculty."
        actions={
          <button type="button" onClick={() => { resetForm(); setOpen(true); }} className={adminBtnPrimary}>
            <Plus className="w-4 h-4" />
            New announcement
          </button>
        }
      />

      {open && (
        <div className={adminCard + " p-5 space-y-3"}>
          <h3 className="font-semibold text-slate-800">{editingId ? "Edit announcement" : "New announcement"}</h3>
          <input className={adminInput} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            className={adminTextarea}
            rows={4}
            placeholder="Message body"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {!editingId && (
            <AppSelect
              className={adminSelect}
              value={audience}
              onValueChange={(v) => setAudience(v as typeof audience)}
              options={[
                { value: "all", label: "Everyone" },
                { value: "student", label: "Students only" },
                { value: "faculty", label: "Faculty only" },
              ]}
            />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => void submit()} className={adminBtnPrimary}>
              {editingId ? "Save changes" : "Broadcast"}
            </button>
            <button type="button" onClick={resetForm} className={adminBtnSecondary}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={adminCard + " divide-y divide-[#eef2e8]"}>
        {globalAnnouncements.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No announcements yet." />
          </div>
        ) : (
          globalAnnouncements.map((a) => (
            <div key={a.id} className="p-4 flex justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-800">{a.title}</p>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#f5f8f2] text-slate-500">
                    {a.targetAudience ?? "all"}
                  </span>
                  {!a.active && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">
                      inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-1">{a.content}</p>
                <p className="text-xs text-slate-400 mt-2">
                  {a.authorName} · {new Date(a.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button type="button" onClick={() => startEdit(a)} className={adminBtnSecondary + " h-8 px-3 text-xs"}>
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void toggleActive(a)}
                  className={adminBtnSecondary + " h-8 px-3 text-xs"}
                >
                  {a.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(a.id)}
                  className="h-8 px-3 rounded-xl border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50 inline-flex items-center gap-1 justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
