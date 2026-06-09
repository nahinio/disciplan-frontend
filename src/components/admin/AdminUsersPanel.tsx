import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { useAdmin } from "@/hooks/useAdmin";
import type { AdminUser } from "@/hooks/useAdmin";
import { useUserStats } from "@/hooks/useUserStats";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AdminLoading,
  AdminPageHeader,
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminInput,
  adminSelect,
} from "./admin-ui";
import { AppSelect } from "@/components/ui/app-select";

type AdminData = ReturnType<typeof useAdmin>;

export function AdminUsersPanel({ admin }: { admin: AdminData }) {
  const { profile } = useUserStats();
  const { users, loading, suspendUser, activateUser, adjustPoints, deleteUser } = admin;
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "faculty" | "admin">("all");
  const [pointsUserId, setPointsUserId] = useState<string | null>(null);
  const [pointsDelta, setPointsDelta] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState("");
  const [deleteFacultySections, setDeleteFacultySections] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filtered = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    const q = search.toLowerCase();
    return (
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const applyPoints = async () => {
    if (!pointsUserId || !pointsDelta.trim()) return;
    try {
      await adjustPoints(pointsUserId, Number(pointsDelta), "admin_correction");
      toast.success("Reputation points adjusted.");
      setPointsUserId(null);
      setPointsDelta("");
    } catch {
      toast.error("Could not adjust points.");
    }
  };

  const openDeleteDialog = (user: AdminUser) => {
    setDeleteTarget(user);
    setDeleteEmailConfirm("");
    setDeleteFacultySections(false);
  };

  const closeDeleteDialog = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteEmailConfirm("");
    setDeleteFacultySections(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteEmailConfirm.trim().toLowerCase() !== deleteTarget.email.toLowerCase()) {
      toast.error("Email confirmation does not match.");
      return;
    }
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.id, deleteEmailConfirm.trim(), deleteFacultySections);
      toast.success("User deleted permanently.");
      closeDeleteDialog();
      setDeleteTarget(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete user.";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const currentUserId = users.find((u) => u.email === profile.email)?.id;

  if (loading && users.length === 0) return <AdminLoading />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="User & security"
        title="User directory"
        description="Suspend, restore, or permanently delete accounts. To add new faculty, use the Faculty tab."
        actions={
          <Link
            to="/dashboard"
            search={{ view: "faculty" }}
            className={adminBtnPrimary + " no-underline"}
          >
            <UserPlus className="w-4 h-4" />
            Add faculty
          </Link>
        }
      />

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users…"
          className={adminInput + " max-w-xs"}
        />
        <AppSelect
          className={adminSelect + " max-w-[160px]"}
          value={roleFilter}
          onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}
          options={[
            { value: "all", label: "All roles" },
            { value: "student", label: "Students" },
            { value: "faculty", label: "Faculty" },
            { value: "admin", label: "Admins" },
          ]}
        />
      </div>

      {pointsUserId && (
        <div className={adminCard + " p-4 flex flex-wrap items-end gap-3"}>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Point adjustment</label>
            <input
              type="number"
              className={adminInput + " w-32 mt-1"}
              value={pointsDelta}
              onChange={(e) => setPointsDelta(e.target.value)}
              placeholder="+/- XP"
            />
          </div>
          <button type="button" onClick={() => void applyPoints()} className={adminBtnPrimary}>
            Apply
          </button>
          <button type="button" onClick={() => setPointsUserId(null)} className={adminBtnSecondary}>
            Cancel
          </button>
        </div>
      )}

      <div className={adminCard + " overflow-hidden"}>
        <table className="w-full text-sm">
          <thead className="bg-[#f5f8f2] text-left text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const isSelf = currentUserId != null && u.id === currentUserId;
              const isAdmin = u.role === "admin";
              return (
                <tr key={u.id} className="border-t border-[#eef2e8]">
                  <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3 capitalize">{u.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.status === "active"
                          ? "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-bold"
                          : "text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-xs font-bold"
                      }
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {!isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => setPointsUserId(u.id)}
                          className="text-xs font-semibold text-slate-600 hover:text-rose-600"
                        >
                          Adjust XP
                        </button>
                        {u.status === "active" ? (
                          <button
                            type="button"
                            onClick={() => void suspendUser(u.id).then(() => toast.success("User suspended."))}
                            className="text-xs font-semibold text-rose-600 hover:underline"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void activateUser(u.id).then(() => toast.success("User restored."))}
                            className="text-xs font-semibold text-emerald-700 hover:underline"
                          >
                            Restore
                          </button>
                        )}
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => openDeleteDialog(u)}
                            className="text-xs font-semibold text-rose-700 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <AlertDialogContent className="max-w-md w-full bg-popover border border-border shadow-2xl rounded-2xl p-6">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
              Delete user permanently?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-xs text-muted-foreground leading-relaxed mt-2 space-y-3">
                {deleteTarget && (
                  <>
                    <p>
                      This will permanently remove{" "}
                      <span className="font-semibold text-slate-700">{deleteTarget.name}</span> (
                      {deleteTarget.email}) and all of their personal data: enrollments, submissions,
                      blogs, forum posts, teams, planner tasks, and notifications.
                    </p>
                    {deleteTarget.role === "faculty" && (
                      <label className="flex items-start gap-2 cursor-pointer text-left">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={deleteFacultySections}
                          onChange={(e) => setDeleteFacultySections(e.target.checked)}
                        />
                        <span>
                          Also delete all sections this faculty teaches (enrollments, grades,
                          announcements, chat, and section teams). This cannot be undone.
                        </span>
                      </label>
                    )}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Type <span className="text-slate-600">{deleteTarget.email}</span> to confirm
                      </label>
                      <input
                        type="email"
                        value={deleteEmailConfirm}
                        onChange={(e) => setDeleteEmailConfirm(e.target.value)}
                        className={adminInput + " w-full"}
                        placeholder={deleteTarget.email}
                        autoComplete="off"
                      />
                    </div>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2">
            <AlertDialogCancel
              disabled={deleting}
              className="h-9 px-4 rounded-full border border-border text-xs font-bold"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                deleting ||
                !deleteTarget ||
                deleteEmailConfirm.trim().toLowerCase() !== deleteTarget.email.toLowerCase()
              }
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              className="h-9 px-4 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-600/90 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
