import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import { clearTokens, getAccessToken, isAuthenticated } from "@/lib/auth";

export interface StreakSummary {
  code: string;
  current: number;
  best: number;
}

export interface ProfileData {
  id: number;
  name: string;
  email: string;
  trimester: string;
  tier: string;
  tierCode: string;
  points: number;
  nextTierPoints: number;
  streaks: StreakSummary[];
  photo: string;
  role: "student" | "faculty" | "admin";
  status: "active" | "pending" | "suspended";
  sections?: string[];
  bio?: string;
}

export const ROLE_AVATAR_GRADIENT: Record<ProfileData["role"], string> = {
  student: "from-rose-500 to-amber-500",
  faculty: "from-emerald-500 to-teal-600",
  admin: "from-slate-900 via-slate-800 to-zinc-900",
};

/** @deprecated Preset colors removed from settings — kept for legacy DB rows only. */
export const PHOTO_PRESETS: Record<string, string> = {
  "rose-amber": ROLE_AVATAR_GRADIENT.student,
  "emerald-teal": ROLE_AVATAR_GRADIENT.faculty,
  "midnight-navy": ROLE_AVATAR_GRADIENT.admin,
};

export function hasCustomAvatar(photo?: string): boolean {
  return Boolean(photo && (photo.startsWith("data:image") || photo.startsWith("http")));
}

export function getRoleAvatarGradient(role: ProfileData["role"] = "student"): string {
  return ROLE_AVATAR_GRADIENT[role] ?? ROLE_AVATAR_GRADIENT.student;
}

export function getPhotoClass(photo?: string, role: ProfileData["role"] = "student"): string {
  if (hasCustomAvatar(photo)) return "";
  return getRoleAvatarGradient(role);
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  notifyAcademic: boolean;
  notifyTeams: boolean;
  notifySystem: boolean;
  notifyMessages: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  userId?: number;
  isUser?: boolean;
}

const EMPTY_PROFILE: ProfileData = {
  id: 0,
  name: "",
  email: "",
  trimester: "",
  tier: "",
  tierCode: "",
  points: 0,
  nextTierPoints: 0,
  streaks: [],
  photo: "",
  role: "student",
  status: "active",
  sections: [],
  bio: "",
};

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "light",
  notifyAcademic: true,
  notifyTeams: true,
  notifySystem: true,
  notifyMessages: true,
};

function resolvePhoto(me: Record<string, unknown>): string {
  const avatarUrl = me.avatar_url ? String(me.avatar_url) : "";
  if (avatarUrl) return avatarUrl;
  return "";
}

function mapMeToProfile(me: Record<string, unknown>): ProfileData {
  const sections = Array.isArray(me.sections)
    ? (me.sections as { section_key?: string }[]).map((s) => s.section_key ?? "").filter(Boolean)
    : [];
  const streaks = Array.isArray(me.streaks)
    ? (me.streaks as Record<string, unknown>[]).map((s) => ({
        code: String(s.streak_code ?? ""),
        current: Number(s.current_count ?? 0),
        best: Number(s.best_count ?? 0),
      }))
    : [];

  return {
    id: Number(me.id ?? 0),
    name: String(me.display_name ?? ""),
    email: String(me.email ?? ""),
    trimester: "",
    tier: String(me.tier_label ?? ""),
    tierCode: String(me.tier_code ?? ""),
    points: Number(me.total_points ?? 0),
    nextTierPoints: Number(me.next_tier_points ?? 0),
    streaks,
    photo: resolvePhoto(me),
    role: (me.role_code as ProfileData["role"]) ?? "student",
    status: (me.status_code as ProfileData["status"]) ?? "active",
    sections,
    bio: me.bio ? String(me.bio) : "",
  };
}

interface UserStatsContextValue {
  profile: ProfileData;
  preferences: UserPreferences;
  todayLeaderboard: LeaderboardEntry[];
  allTimeLeaderboard: LeaderboardEntry[];
  loading: boolean;
  profileReady: boolean;
  updateProfile: (fields: Partial<ProfileData>) => void;
  saveProfile: (displayName: string, photo?: string | null, bio?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  togglePreference: (key: keyof UserPreferences) => Promise<void>;
  setTheme: (theme: "light" | "dark" | "system") => Promise<void>;
  resetData: () => void;
  logout: () => void;
  getInitials: () => string;
}

const UserStatsContext = createContext<UserStatsContextValue | null>(null);

function applyTheme(_theme: "light" | "dark" | "system") {
  if (typeof window === "undefined") return;
  const root = window.document.documentElement;
  root.classList.remove("dark");
  root.classList.add("light");
}

export function UserStatsProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileData>(EMPTY_PROFILE);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [todayLeaderboard, setTodayLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(() =>
    typeof window !== "undefined" && isAuthenticated()
  );
  const [profileReady, setProfileReady] = useState(false);
  const profileEmailRef = useRef("");

  const refreshProfile = useCallback(async () => {
    if (!getAccessToken()) {
      setProfile(EMPTY_PROFILE);
      setTodayLeaderboard([]);
      setAllTimeLeaderboard([]);
      setLoading(false);
      setProfileReady(true);
      profileEmailRef.current = "";
      return;
    }

    const isInitialLoad = !profileEmailRef.current;
    if (isInitialLoad) setLoading(true);

    try {
      const me = await api.getMe();
      const mapped = mapMeToProfile(me);
      profileEmailRef.current = mapped.email;
      setProfile(mapped);
      setPreferences({
        theme: (me.theme as UserPreferences["theme"]) ?? "light",
        notifyAcademic: me.notify_academic == null ? true : Boolean(me.notify_academic),
        notifyTeams: me.notify_teams == null ? true : Boolean(me.notify_teams),
        notifySystem: me.notify_system == null ? true : Boolean(me.notify_system),
        notifyMessages: me.notify_messages == null ? true : Boolean(me.notify_messages),
      });

      // Faculty and admin have no gamification UI — skip leaderboard fetches entirely.
      if (mapped.role === "admin" || mapped.role === "faculty") {
        setTodayLeaderboard([]);
        setAllTimeLeaderboard([]);
      } else {
        try {
          const [today, allTime] = await Promise.all([
            api.getLeaderboard("today"),
            api.getLeaderboard("all_time"),
          ]);
          const uid = Number(me.id);
          const mapLb = (e: (typeof today.items)[number]) => ({
            rank: Number((e as { leaderboard_rank?: number }).leaderboard_rank ?? e.rank),
            name: e.display_name,
            points: e.points,
            userId: e.user_id,
            isUser: e.user_id === uid,
          });
          setTodayLeaderboard(today.items.map(mapLb));
          setAllTimeLeaderboard(allTime.items.map(mapLb));
        } catch {
          setTodayLeaderboard([]);
          setAllTimeLeaderboard([]);
        }
      }
    } catch {
      setProfile(EMPTY_PROFILE);
      profileEmailRef.current = "";
    } finally {
      setLoading(false);
      setProfileReady(true);
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    applyTheme(preferences.theme);
  }, [preferences.theme]);

  const updateProfile = useCallback((fields: Partial<ProfileData>) => {
    setProfile((prev) => ({ ...prev, ...fields }));
  }, []);

  const saveProfile = useCallback(
    async (displayName: string, photo?: string | null, bio?: string) => {
      const body: Record<string, unknown> = { display_name: displayName };
      if (bio !== undefined) {
        body.bio = bio;
      }

      if (photo === null) {
        body.avatar_file_id = null;
      } else if (photo?.startsWith("data:image")) {
        const blob = await fetch(photo).then((r) => r.blob());
        const file = new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" });
        const uploaded = await api.uploadFile(file, "avatars");
        body.avatar_file_id = uploaded.file_id;
      }

      await api.updateProfile(body);
      await refreshProfile();
    },
    [refreshProfile]
  );

  const togglePreference = useCallback(async (key: keyof UserPreferences) => {
    setPreferences((prev) => {
      const next = { ...prev };
      if (key === "theme") return prev;
      (next[key] as boolean) = !next[key];
      void api.updatePreferences({
        notify_academic: next.notifyAcademic,
        notify_teams: next.notifyTeams,
        notify_system: next.notifySystem,
        notify_messages: next.notifyMessages,
      });
      return next;
    });
  }, []);

  const setTheme = useCallback(async (theme: "light" | "dark" | "system") => {
    setPreferences((prev) => ({ ...prev, theme }));
    await api.updatePreferences({ theme });
  }, []);

  const resetData = useCallback(() => {
    clearTokens();
    window.location.href = "/";
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    profileEmailRef.current = "";
    window.location.href = "/";
  }, []);

  const getInitials = useCallback(() => {
    const parts = profile.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return profile.name.slice(0, 2).toUpperCase() || "?";
  }, [profile.name]);

  const value = useMemo(
    () => ({
      profile,
      preferences,
      todayLeaderboard,
      allTimeLeaderboard,
      loading,
      profileReady,
      updateProfile,
      saveProfile,
      refreshProfile,
      togglePreference,
      setTheme,
      resetData,
      logout,
      getInitials,
    }),
    [
      profile,
      preferences,
      todayLeaderboard,
      allTimeLeaderboard,
      loading,
      profileReady,
      updateProfile,
      saveProfile,
      refreshProfile,
      togglePreference,
      setTheme,
      resetData,
      logout,
      getInitials,
    ]
  );

  return <UserStatsContext.Provider value={value}>{children}</UserStatsContext.Provider>;
}

export function useUserStats(): UserStatsContextValue {
  const ctx = useContext(UserStatsContext);
  if (!ctx) {
    throw new Error("useUserStats must be used within UserStatsProvider");
  }
  return ctx;
}
