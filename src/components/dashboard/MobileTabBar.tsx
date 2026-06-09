import { useState } from "react";
import { Home, Calendar, BookOpen, Trophy, Plus, GraduationCap, Users, HelpCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useUserStats } from "@/hooks/useUserStats";
import { useTeamsHub } from "@/hooks/useTeamsHub";
import { EventDialog } from "./EventDialog";

const studentItems: { icon: typeof Home; label: string; to?: string; primary?: boolean }[] = [
  { icon: Home, label: "Home", to: "/dashboard" },
  { icon: Calendar, label: "Calendar", to: "/dashboard" },
  { icon: Plus, label: "Add", primary: true },
  { icon: BookOpen, label: "Courses", to: "/courses" },
  { icon: Trophy, label: "You", to: "/settings" },
];

const facultyItems: { icon: typeof Home; label: string; to?: string; primary?: boolean }[] = [
  { icon: Home, label: "Tasks", to: "/dashboard" },
  { icon: BookOpen, label: "Sections", to: "/courses" },
  { icon: Plus, label: "Add", primary: true },
  { icon: GraduationCap, label: "Doubts", to: "/doubts" },
  { icon: Calendar, label: "You", to: "/settings" },
];

const studentItemsWithTeams: { icon: typeof Home; label: string; to?: string; primary?: boolean }[] = [
  { icon: Home, label: "Home", to: "/dashboard" },
  { icon: HelpCircle, label: "Doubts", to: "/doubts" },
  { icon: Plus, label: "Add", primary: true },
  { icon: BookOpen, label: "Courses", to: "/courses" },
  { icon: Users, label: "Teams", to: "/teams" },
];

export function MobileTabBar() {
  const [eventOpen, setEventOpen] = useState(false);
  const { profile } = useUserStats();
  const { invitations } = useTeamsHub();
  const items =
    profile.role === "faculty"
      ? facultyItems
      : profile.role === "student"
        ? studentItemsWithTeams
        : studentItems;
  const teamBadge = profile.role === "student" ? invitations.length : 0;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 border-t border-[#dce5d4] bg-paper/90 backdrop-blur-md">
      <ul className="grid grid-cols-5 h-full">
        {items.map(({ icon: Icon, label, primary, to }) => (
          <li key={label} className="grid place-items-center">
            {primary ? (
              <button
                type="button"
                onClick={() => setEventOpen(true)}
                aria-label="Add event"
                className="w-12 h-12 -mt-4 rounded-full bg-rose text-white grid place-items-center shadow-lg shadow-rose/30"
              >
                <Icon className="w-5 h-5" />
              </button>
            ) : (
              <Link
                to={to!}
                className="relative flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground"
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px]">{label}</span>
                {to === "/teams" && teamBadge > 0 && (
                  <span className="absolute -top-0.5 right-2 min-w-[14px] h-3.5 px-0.5 rounded-full bg-rose-600 text-white text-[8px] font-bold grid place-items-center">
                    {teamBadge}
                  </span>
                )}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <EventDialog open={eventOpen} onClose={() => setEventOpen(false)} initialDate={new Date()} />
    </nav>
  );
}
