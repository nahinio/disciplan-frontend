import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { setSignupDraft } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";

interface Props {
  email: string;
  onBack: () => void;
}

export function CodeStep({ email, onBack }: Props) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const verify = async (value: string) => {
    if (value.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      await api.verifyOtp(email, value);
      setSignupDraft({ email, code: value });
      setSuccess(true);
      await new Promise((r) => setTimeout(r, 400));
      navigate({ to: "/onboarding" });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Invalid or expired code";
      setError(msg);
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    setCode(value);
    if (error) setError(null);
    if (value.length === 6) {
      void verify(value);
    }
  };

  const resend = async () => {
    try {
      const { api } = await import("@/lib/api");
      await api.sendOtp(email);
      toast.success("New code sent", { description: `Sent to ${email}` });
    } catch {
      toast.error("Could not resend code");
    }
  };

  return (
    <div>
      <div className="mb-8">
        <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-rose-600 font-medium">
          <span className="w-1 h-1 rounded-full bg-rose-600" />
          Step 2 of 2
        </span>
        <h1 className="mt-3 font-display text-3xl md:text-4xl tracking-tighter font-semibold leading-[1.05]">
          Enter your code
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="text-ink font-medium">{email}</span>.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={handleChange}
          disabled={loading || success}
          autoFocus
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>

        <div className="h-6 flex items-center">
          {loading && (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Verifying…
            </span>
          )}
          {success && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-2 text-xs font-medium text-emerald-600"
            >
              <span className="grid place-items-center w-4 h-4 rounded-full bg-emerald-500 text-white">
                <Check className="w-3 h-3" strokeWidth={3} />
              </span>
              Verified — redirecting…
            </motion.span>
          )}
          {error && (
            <span className="text-xs font-medium text-rose-600">{error}</span>
          )}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Change email
        </button>
        <button
          type="button"
          onClick={resend}
          className="text-rose-600 hover:text-rose-700 font-medium transition-colors"
        >
          Resend code
        </button>
      </div>
    </div>
  );
}
