import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { EmailStep } from "./EmailStep";
import { CodeStep } from "./CodeStep";
import { DisciPlanLogo } from "@/components/DisciPlanLogo";

export function SignupFlow() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");

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
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.div
                key="email"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <EmailStep
                  initialEmail={email}
                  onSubmit={(value) => {
                    setEmail(value);
                    setStep("code");
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="code"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <CodeStep email={email} onBack={() => setStep("email")} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
