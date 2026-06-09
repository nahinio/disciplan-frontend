import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Loader2, School, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DisciPlanLogo } from "@/components/DisciPlanLogo";
import { api, ApiError } from "@/lib/api";
import { isDashboardPath, resolvePostLoginPath } from "@/lib/routeAuth";
import { useUserStats } from "@/hooks/useUserStats";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";

interface Props {
  mode?: AuthMode;
  redirect?: string;
}

export function AuthFlow({ mode: initialMode = "login", redirect }: Props) {
  const navigate = useNavigate();
  const { refreshProfile } = useUserStats();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"student" | "faculty">("student");
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const goAfterAuth = async (verificationPending?: boolean) => {
    await refreshProfile();
    if (verificationPending) {
      navigate({ to: "/dashboard" });
      return;
    }
    const dest = await resolvePostLoginPath(redirect);
    if (isDashboardPath(dest)) {
      if (dest.includes("view=overview")) {
        navigate({ to: "/dashboard", search: { view: "overview" } });
      } else {
        navigate({ to: "/dashboard" });
      }
    } else if (dest.startsWith("/")) {
      window.location.href = dest;
    } else {
      navigate({ to: "/dashboard" });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password");
      return;
    }
    setLoading(true);
    try {
      const res = await api.login(email.trim().toLowerCase(), password);
      toast.success("Welcome back!");
      await goAfterAuth(res.verification_pending);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  };

  const submitFacultyVerification = async () => {
    setLoading(true);
    try {
      const res = await api.register({
        email: email.trim().toLowerCase(),
        password,
        display_name: name.trim(),
        role_code: "faculty",
        message: requestMessage.trim() || undefined,
      });
      setVerificationOpen(false);
      toast.success("Verification request submitted");
      await goAfterAuth(res.verification_pending);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not submit request");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.error("Fill in all required fields");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (role === "faculty") {
      setLoading(true);
      try {
        const check = await api.checkFacultyRoster(email.trim().toLowerCase());
        if (!check.on_roster) {
          setVerificationOpen(true);
          setLoading(false);
          return;
        }
      } catch {
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await api.register({
        email: email.trim().toLowerCase(),
        password,
        display_name: name.trim(),
        role_code: role,
      });
      toast.success(
        role === "faculty"
          ? "Faculty account created — welcome!"
          : `Welcome, ${name.split(" ")[0] || "friend"}!`
      );
      await goAfterAuth(res.verification_pending);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full h-11 px-3 rounded-xl border border-[#dce5d4] bg-white focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-sm";

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <Toaster position="top-center" richColors />
      <header className="px-5 md:px-8 h-16 flex items-center border-b border-black/5">
        <Link to="/" className="flex items-center gap-2">
          <DisciPlanLogo />
          <span className="font-bold text-[17px] tracking-tight text-ink">DisciPlan</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="flex rounded-xl border border-[#dce5d4] p-1 bg-white mb-8">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  if (m === mode) return;
                  navigate({
                    to: m === "login" ? "/login" : "/signup",
                    search: redirect ? { redirect } : undefined,
                  });
                }}
                className={cn(
                  "flex-1 h-9 rounded-lg text-sm font-semibold transition",
                  mode === m
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {mode === "login" ? (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-rose-600 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Secure access
                </span>
                <h1 className="mt-3 font-display text-3xl tracking-tighter font-semibold">Welcome back</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Students, faculty, and administrators use this portal.
                </p>
                <form onSubmit={(e) => void handleLogin(e)} className="mt-8 space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Email</label>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@uiu.ac.bd"
                      className={inputCls + " mt-1"}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Password</label>
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputCls + " mt-1"}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Sign in
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="signup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-rose-600 font-medium">
                  Create account
                </span>
                <h1 className="mt-3 font-display text-3xl tracking-tighter font-semibold">Join DisciPlan</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Choose your role and set up your account in one step.
                </p>

                <form onSubmit={(e) => void handleSignup(e)} className="mt-6 space-y-5">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">I am a</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole("student")}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition",
                          role === "student"
                            ? "border-rose-600 bg-rose-50/30 text-rose-600"
                            : "border-black/5 hover:border-black/10"
                        )}
                      >
                        <GraduationCap className="w-6 h-6" />
                        <span className="text-sm font-semibold">Student</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("faculty")}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition",
                          role === "faculty"
                            ? "border-rose-600 bg-rose-50/30 text-rose-600"
                            : "border-black/5 hover:border-black/10"
                        )}
                      >
                        <School className="w-6 h-6" />
                        <span className="text-sm font-semibold">Faculty</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Full name</label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Tanvir Rahman"
                      className={inputCls + " mt-1"}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">UIU email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@uiu.ac.bd"
                      className={inputCls + " mt-1"}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className={inputCls + " mt-1"}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Create account
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Administrators are provisioned by the institution — use Log in with your admin credentials.
          </p>
        </motion.div>
      </main>

      <Dialog open={verificationOpen} onOpenChange={setVerificationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Faculty verification required</DialogTitle>
            <DialogDescription>
              You are not verified yet. Your email is not on the faculty roster. Submit a verification
              request and an administrator will review it before you can access the faculty dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-xs font-medium text-slate-500">Optional message to admin</label>
            <textarea
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              rows={3}
              placeholder="Department, courses you teach, etc."
              className="w-full p-3 rounded-xl border border-[#dce5d4] text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#7d9b76]"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setVerificationOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              disabled={loading}
              onClick={() => void submitFacultyVerification()}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Request verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
