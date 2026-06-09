import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { DisciPlanLogo } from "@/components/DisciPlanLogo";
import { api, ApiError } from "@/lib/api";
import { resolvePostLoginPath } from "@/lib/routeAuth";
import { useUserStats } from "@/hooks/useUserStats";

interface Props {
  redirect?: string;
}

export function LoginFlow({ redirect }: Props) {
  const navigate = useNavigate();
  const { refreshProfile } = useUserStats();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password");
      return;
    }
    setLoading(true);
    try {
      await api.login(email.trim().toLowerCase(), password);
      await refreshProfile();
      const dest = await resolvePostLoginPath(redirect);
      toast.success("Welcome back!");
      if (dest === "/onboarding") {
        navigate({ to: "/onboarding" });
      } else if (dest === "/dashboard" || dest.startsWith("/dashboard?") || dest === "/app" || dest.startsWith("/app?")) {
        if (dest.includes("view=overview")) {
          navigate({ to: "/dashboard", search: { view: "overview" } });
        } else {
          navigate({ to: "/dashboard" });
        }
      } else if (dest.startsWith("/")) {
        window.location.href = dest.replace(/^\/app/, "/dashboard");
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not sign in";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <Toaster position="top-center" richColors />
      <header className="px-5 md:px-8 h-16 flex items-center">
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
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-rose-600 font-medium">
            <span className="w-1 h-1 rounded-full bg-rose-600" />
            Welcome back
          </span>
          <h1 className="mt-3 font-display text-3xl md:text-4xl tracking-tighter font-semibold leading-[1.05]">
            Sign in to DisciPlan
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Use your UIU email and password to continue.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                UIU Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@uiu.ac.bd"
                className="w-full h-10 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#dce5d4] focus:outline-none focus:ring-1 focus:ring-[#7d9b76] text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            New here?{" "}
            <Link to="/signup" className="text-rose-600 font-semibold hover:text-rose-700">
              Create an account
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
