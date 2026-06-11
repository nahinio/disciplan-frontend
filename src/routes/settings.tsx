import { createFileRoute } from "@tanstack/react-router";
import { appRouteSsr, requireAuth } from "@/lib/routeAuth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import {
  useUserStats,
  getRoleAvatarGradient,
  hasCustomAvatar,
} from "@/hooks/useUserStats";
import { api, ApiError } from "@/lib/api";
import {
  User,
  ShieldAlert,
  Check,
  RefreshCw,
  Lock,
  Upload,
  Trash2,
  Trophy,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/settings")({
  ssr: appRouteSsr,
  beforeLoad: () => {
    requireAuth();
  },
  head: () => ({
    meta: [
      { title: "DisciPlan — Settings" },
      {
        name: "description",
        content: "Configure your academic profile, password, and account.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, saveProfile, logout } = useUserStats();

  const [name, setName] = useState(profile.name);
  const [email] = useState(profile.email);
  const [photo, setPhoto] = useState(profile.photo);
  const [bio, setBio] = useState(profile.bio || "");

  useEffect(() => {
    setName(profile.name);
    setPhoto(profile.photo);
    setBio(profile.bio || "");
  }, [profile.name, profile.photo, profile.bio]);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setSaveSuccess(false);
    try {
      let photoArg: string | null | undefined;
      if (photo.startsWith("data:image")) {
        photoArg = photo;
      } else if (!hasCustomAvatar(photo) && hasCustomAvatar(profile.photo)) {
        photoArg = null;
      }
      await saveProfile(name.trim(), photoArg, bio.trim());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    toast.error("Password changes are not available via the API yet.");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhoto("");
  };

  const handleDeleteAccount = async () => {
    if (deleteEmailConfirm.trim().toLowerCase() !== email.trim().toLowerCase()) {
      toast.error("Confirmation email does not match your account email.");
      return;
    }
    setIsDeleting(true);
    try {
      await api.deleteAccount(deleteEmailConfirm.trim());
      toast.success("Your account has been deleted.");
      logout();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete account.");
    } finally {
      setIsDeleting(false);
    }
  };

  const roleGradient = getRoleAvatarGradient(profile.role);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-foreground animate-in fade-in duration-200">
      <TopHeader />
      <div className="flex-1 flex min-h-0">
        <main className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
          <div className="max-w-4xl mx-auto px-5 md:px-8 py-8 space-y-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                App Preferences
              </p>
              <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mt-2 text-slate-800 leading-[1.05]">
                Settings
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl text-xs font-medium">
                Update your profile photo, name, and password. All notifications are enabled by default.
              </p>
              {profile.role === "student" && (
                <div className="flex flex-wrap gap-4 mt-4">
                  <Link
                    to="/profile/$userId"
                    params={{ userId: String(profile.id) }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:underline"
                  >
                    View public profile
                  </Link>
                  <Link
                    to="/achievements"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:underline"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    Achievements & badges
                  </Link>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5 md:col-span-1">
                <div className="p-3 bg-muted/40 dark:bg-muted/10 border border-border rounded-xl space-y-1">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    Sections
                  </div>
                  <a
                    href="#profile"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-card border border-border/80 text-foreground shadow-sm transition"
                  >
                    <User className="w-3.5 h-3.5 text-rose" />
                    Profile Details
                  </a>
                  <a
                    href="#security"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Security & Password
                  </a>
                  <a
                    href="#danger"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose hover:bg-rose-soft/10 transition"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose/80" />
                    Delete Account
                  </a>
                </div>
              </div>

              <div className="space-y-6 md:col-span-2">
                <div
                  id="profile"
                  className="p-5 bg-white dark:bg-card border border-border rounded-2xl shadow-sm space-y-4"
                >
                  <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                    <div className="w-8 h-8 rounded-lg bg-rose-soft/20 flex items-center justify-center text-rose">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">Profile Details</h3>
                      <p className="text-[10px] text-muted-foreground">
                        Manage your identity and profile photo
                      </p>
                    </div>
                  </div>

                  {saveSuccess && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl font-medium">
                      <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      Profile details saved successfully!
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="space-y-2.5 pb-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Profile Photo
                      </label>
                      <div className="flex items-center gap-4 flex-wrap">
                        {hasCustomAvatar(photo) ? (
                          <img
                            src={photo}
                            alt="Profile preview"
                            className="w-16 h-16 rounded-full object-cover border-2 border-rose shadow-sm shrink-0"
                          />
                        ) : (
                          <div
                            className={cn(
                              "w-16 h-16 rounded-full bg-gradient-to-br border-2 border-rose/30 shadow-sm shrink-0",
                              roleGradient
                            )}
                          />
                        )}

                        <div className="flex flex-col gap-2">
                          <input
                            type="file"
                            id="settings-photo-file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor="settings-photo-file"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 text-[10px] font-bold cursor-pointer transition shadow-sm w-fit"
                          >
                            <Upload className="w-3.5 h-3.5 text-rose" />
                            Upload profile picture
                          </label>
                          {hasCustomAvatar(photo) && (
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="text-[10px] font-semibold text-muted-foreground hover:text-rose text-left w-fit cursor-pointer"
                            >
                              Remove photo
                            </button>
                          )}
                          <p className="text-[10px] text-muted-foreground max-w-xs">
                            Without a photo, a role-colored gradient is used automatically.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-rose focus:ring-1 focus:ring-rose transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Bio
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        maxLength={500}
                        placeholder="Tell others about yourself..."
                        className="w-full min-h-[80px] p-3.5 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-rose focus:ring-1 focus:ring-rose transition resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        readOnly
                        className="w-full h-10 px-3.5 rounded-xl border border-border bg-muted/30 text-xs font-semibold text-muted-foreground cursor-not-allowed"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-4 h-9 bg-rose hover:bg-rose/90 text-white text-xs font-bold rounded-full transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingProfile ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Profile"
                      )}
                    </button>
                  </form>
                </div>

                <div
                  id="security"
                  className="p-5 bg-white dark:bg-card border border-border rounded-2xl shadow-sm space-y-4"
                >
                  <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                    <div className="w-8 h-8 rounded-lg bg-rose-soft/20 flex items-center justify-center text-rose">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">Security & Password</h3>
                      <p className="text-[10px] text-muted-foreground">
                        Manage your credentials and sign-in protection
                      </p>
                    </div>
                  </div>

                  {passwordSuccess && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl font-medium">
                      <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      Password changed successfully!
                    </div>
                  )}

                  {passwordError && (
                    <div className="flex items-center gap-2 p-3 bg-rose-soft/10 border border-rose/20 text-rose text-xs rounded-xl font-medium animate-pulse">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-rose" />
                      {passwordError}
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-rose focus:ring-1 focus:ring-rose transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-rose focus:ring-1 focus:ring-rose transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-rose focus:ring-1 focus:ring-rose transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="px-4 h-9 bg-rose hover:bg-rose/90 text-white text-xs font-bold rounded-full transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isChangingPassword ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </button>
                  </form>
                </div>

                <div
                  id="danger"
                  className="p-5 bg-rose-soft/5 dark:bg-rose-soft/5 border border-rose/25 rounded-2xl space-y-4"
                >
                  <div className="flex items-center gap-2 pb-2 border-b border-rose/10">
                    <div className="w-8 h-8 rounded-lg bg-rose-soft/20 flex items-center justify-center text-rose">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-rose">Delete Account</h3>
                      <p className="text-[10px] text-rose/70">
                        Permanently remove your DisciPlan account and data
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3.5 bg-white dark:bg-card border border-rose/10 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-rose">Delete DisciPlan Account</p>
                      <p className="text-[10px] text-muted-foreground leading-normal mt-0.5 font-medium">
                        This permanently deletes your profile, course data, and activity. This cannot be undone.
                      </p>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="px-3.5 h-8 bg-rose text-white text-xs font-bold rounded-full hover:bg-rose/90 transition shrink-0 cursor-pointer flex items-center gap-1.5 shadow-sm">
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Account
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-md w-full bg-popover border border-border shadow-2xl rounded-2xl p-6">
                        <AlertDialogHeader className="text-left">
                          <AlertDialogTitle className="text-lg font-bold flex items-center gap-2 text-rose">
                            <ShieldAlert className="w-5 h-5 text-rose animate-pulse" />
                            Delete your account?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-2">
                            Type your email address to confirm. Your account, enrollments, tasks, and
                            submissions will be permanently removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <input
                          type="email"
                          value={deleteEmailConfirm}
                          onChange={(e) => setDeleteEmailConfirm(e.target.value)}
                          placeholder={email}
                          className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-rose focus:ring-1 focus:ring-rose mt-3"
                        />
                        <AlertDialogFooter className="mt-4 flex gap-2">
                          <AlertDialogCancel
                            className="h-9 px-4 rounded-full border border-border text-xs font-bold cursor-pointer"
                            onClick={() => setDeleteEmailConfirm("")}
                          >
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.preventDefault();
                              void handleDeleteAccount();
                            }}
                            disabled={
                              isDeleting ||
                              deleteEmailConfirm.trim().toLowerCase() !== email.trim().toLowerCase()
                            }
                            className="h-9 px-4 rounded-full bg-rose text-white text-xs font-bold hover:bg-rose/90 transition cursor-pointer disabled:opacity-50"
                          >
                            {isDeleting ? "Deleting…" : "Yes, delete my account"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
