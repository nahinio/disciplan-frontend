import { TIER_LADDER } from "@/lib/tiers";

/** Public assets in `public/tier badges/` */
const TIER_BADGE_BASE = "/tier badges";

const TIER_BADGE_FILES: Record<string, string> = {
  recruit: "1_Recruit.png",
  rookie: "2_Rookie.png",
  contender: "3_Contender.png",
  specialist: "4_Specialist.png",
  elite: "5_Elite.png",
  veteran: "6_Veteran.png",
  master: "7_Master.png",
  champion: "8_Champion.png",
  legend: "9_Legend.png",
  titan: "10_Titan.png",
};

export function resolveTierCode(
  tierCode?: string | null,
  tierLabel?: string | null
): string | null {
  if (tierCode) {
    const normalized = tierCode.toLowerCase().trim();
    if (TIER_BADGE_FILES[normalized]) return normalized;
  }
  if (tierLabel) {
    const match = TIER_LADDER.find(
      (t) => t.label.toLowerCase() === tierLabel.toLowerCase().trim()
    );
    if (match) return match.code;
  }
  return null;
}

export function tierBadgeUrl(
  tierCode?: string | null,
  tierLabel?: string | null
): string | null {
  const code = resolveTierCode(tierCode, tierLabel);
  if (!code) return null;
  const file = TIER_BADGE_FILES[code];
  return file ? encodeURI(`${TIER_BADGE_BASE}/${file}`) : null;
}

export function tierDisplayLabel(
  tierCode?: string | null,
  tierLabel?: string | null
): string | null {
  if (tierLabel?.trim()) return tierLabel.trim();
  const code = resolveTierCode(tierCode, tierLabel);
  if (!code) return null;
  return TIER_LADDER.find((t) => t.code === code)?.label ?? null;
}
