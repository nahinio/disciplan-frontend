import {
  Shield,
  Flame,
  Award,
  BookOpen,
  Zap,
  Trophy,
  HelpCircle,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FAMILY_CONFIG: Record<
  string,
  { icon: React.ComponentType<any>; bgClass: string; iconClass: string; borderClass: string }
> = {
  moderator: {
    icon: Shield,
    bgClass: "from-blue-500/10 to-indigo-500/10 border border-blue-200/50 dark:from-blue-950/20 dark:to-indigo-950/10",
    iconClass: "text-indigo-600 dark:text-indigo-400",
    borderClass: "border-indigo-100 dark:border-indigo-900/30",
  },
  iron_will: {
    icon: Flame,
    bgClass: "from-orange-500/10 to-red-500/10 border border-orange-200/50 dark:from-orange-950/20 dark:to-red-950/10",
    iconClass: "text-orange-600 dark:text-orange-400",
    borderClass: "border-orange-100 dark:border-orange-900/30",
  },
  faculty_favorite: {
    icon: Award,
    bgClass: "from-amber-500/10 to-yellow-500/10 border border-amber-200/50 dark:from-amber-950/20 dark:to-yellow-950/10",
    iconClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-100 dark:border-amber-900/30",
  },
  master_author: {
    icon: BookOpen,
    bgClass: "from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 dark:from-emerald-950/20 dark:to-teal-950/10",
    iconClass: "text-emerald-600 dark:text-emerald-400",
    borderClass: "border-emerald-100 dark:border-emerald-900/30",
  },
  catalyst: {
    icon: Zap,
    bgClass: "from-purple-500/10 to-fuchsia-500/10 border border-purple-200/50 dark:from-purple-950/20 dark:to-fuchsia-950/10",
    iconClass: "text-purple-600 dark:text-purple-400",
    borderClass: "border-purple-100 dark:border-purple-900/30",
  },
  speedrunner: {
    icon: Trophy,
    bgClass: "from-rose-500/10 to-pink-500/10 border border-rose-200/50 dark:from-rose-950/20 dark:to-pink-950/10",
    iconClass: "text-rose-600 dark:text-rose-400",
    borderClass: "border-rose-100 dark:border-rose-900/30",
  },
};

export function getFamilyFromCode(code: string): string {
  const c = code.toLowerCase();
  if (c.startsWith("moderator")) return "moderator";
  if (c.startsWith("iron_will")) return "iron_will";
  if (c.startsWith("faculty_favorite")) return "faculty_favorite";
  if (c.startsWith("master_author")) return "master_author";
  if (c.startsWith("catalyst")) return "catalyst";
  if (c.startsWith("speedrunner")) return "speedrunner";
  return "default";
}

export function AchievementBadge({
  code,
  family,
  iconUrl,
  isUnlocked = true,
  className,
  size = "md",
}: {
  code: string;
  family?: string | null;
  iconUrl?: string | null;
  isUnlocked?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const resolvedFamily = family || getFamilyFromCode(code);
  const config = FAMILY_CONFIG[resolvedFamily] || {
    icon: HelpCircle,
    bgClass: "from-slate-50 to-slate-100/50 dark:from-slate-900/20",
    iconClass: "text-slate-600 dark:text-slate-400",
    borderClass: "border-slate-200/50 dark:border-slate-800",
  };

  const IconComponent = config.icon;

  const sizeClasses = {
    sm: "w-11 h-11",
    md: "w-12 h-12",
  };

  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
  };

  const isDemoUrl = !iconUrl || iconUrl.includes("/badges/demo/");

  if (!isDemoUrl && iconUrl) {
    return (
      <div className={cn("relative shrink-0", sizeClasses[size], className)}>
        <img
          src={iconUrl}
          alt=""
          className={cn(
            "w-full h-full object-contain",
            !isUnlocked && "grayscale opacity-50"
          )}
        />
        {!isUnlocked && (
          <Lock className="w-3.5 h-3.5 absolute -bottom-0.5 -right-0.5 text-muted-foreground bg-white dark:bg-slate-950 rounded-full p-0.5" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 rounded-xl border flex items-center justify-center bg-gradient-to-br shadow-sm transition-all duration-300",
        config.bgClass,
        config.borderClass,
        sizeClasses[size],
        !isUnlocked && "opacity-45 grayscale scale-95",
        className
      )}
    >
      <IconComponent className={cn(iconSizes[size], config.iconClass)} />
      {!isUnlocked && (
        <Lock className="w-3.5 h-3.5 absolute -bottom-0.5 -right-0.5 text-muted-foreground bg-white dark:bg-slate-950 rounded-full p-0.5 border border-border" />
      )}
    </div>
  );
}
