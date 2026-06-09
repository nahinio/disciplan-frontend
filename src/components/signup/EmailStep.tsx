import { useState } from "react";
import { z } from "zod";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";

const schema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .refine((v) => v.endsWith("uiu.ac.bd"), {
    message: "Use your UIU email (must end with uiu.ac.bd)",
  });

interface Props {
  initialEmail: string;
  onSubmit: (email: string) => void;
}

export function EmailStep({ initialEmail, onSubmit }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.sendOtp(parsed.data);
      toast.success("Verification code sent", {
        description: `Check your inbox at ${parsed.data}`,
      });
      onSubmit(parsed.data);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not send code";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-rose-600 font-medium">
          <span className="w-1 h-1 rounded-full bg-rose-600" />
          Step 1 of 2
        </span>
        <h1 className="mt-3 font-display text-3xl md:text-4xl tracking-tighter font-semibold leading-[1.05]">
          Verify your UIU email
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">We'll send a 6-digit code to your university inbox.</p>
      </div>

      <form onSubmit={handle} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-ink/70 mb-2">University email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="yourname@uiu.ac.bd"
              className={`w-full rounded-xl border bg-white pl-10 pr-4 py-3 text-sm text-ink placeholder:text-muted-foreground/60 outline-none transition-all focus:ring-4 ${
                error
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                  : "border-slate-200 focus:border-ink/40 focus:ring-ink/10"
              }`}
            />
          </div>
          {error && <p className="mt-2 text-xs text-rose-600 font-medium">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-3 shadow-lg shadow-rose-200 transition-all hover:-translate-y-0.5 disabled:hover:translate-y-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending code…
            </>
          ) : (
            <>
              Send verification code
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        Only uiu.ac.bd addresses are eligible during early access.
      </p>
    </div>
  );
}
