import disciplanLogo from "@/assets/DisciPlan Logo.png";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "w-7 h-7",
  md: "w-8 h-8",
  lg: "w-9 h-9",
} as const;

export function DisciPlanLogo({
  size = "sm",
  className,
  alt = "DisciPlan",
}: {
  size?: keyof typeof sizeClasses;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={disciplanLogo}
      alt={alt}
      className={cn(sizeClasses[size], "object-contain shrink-0", className)}
    />
  );
}
