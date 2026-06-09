import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { ProfileStep } from "./ProfileStep";
import { RoutineStep } from "./RoutineStep";
import { DisciPlanLogo } from "@/components/DisciPlanLogo";

export interface ProfileData {
  name: string;
  department: string;
  departmentId?: number;
  password: string;
  role: "student" | "faculty";
}

export function OnboardingFlow() {
  const [step, setStep] = useState<"profile" | "routine">("profile");
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    department: "",
    password: "",
    role: "student",
  });

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <Toaster position="top-center" richColors />
      <header className="px-5 md:px-8 h-16 flex items-center border-b border-black/5">
        <Link to="/" className="flex items-center gap-2">
          <DisciPlanLogo />
          <span className="font-bold text-[17px] tracking-tight text-ink">DisciPlan</span>
        </Link>
      </header>

      <main className="flex-1 flex items-start justify-center px-5 py-10 md:py-16">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {step === "profile" ? (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProfileStep
                  initial={profile}
                  onSubmit={(data) => {
                    setProfile(data);
                    setStep("routine");
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="routine"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <RoutineStep profile={profile} onBack={() => setStep("profile")} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
