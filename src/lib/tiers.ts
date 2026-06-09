export const TIER_LADDER = [
  { code: "recruit", label: "Recruit", minPoints: 0 },
  { code: "rookie", label: "Rookie", minPoints: 50 },
  { code: "contender", label: "Contender", minPoints: 150 },
  { code: "specialist", label: "Specialist", minPoints: 300 },
  { code: "elite", label: "Elite", minPoints: 500 },
  { code: "veteran", label: "Veteran", minPoints: 750 },
  { code: "master", label: "Master", minPoints: 1050 },
  { code: "champion", label: "Champion", minPoints: 1400 },
  { code: "legend", label: "Legend", minPoints: 1800 },
  { code: "titan", label: "Titan", minPoints: 2300 },
] as const;

export function tierProgress(
  points: number,
  tierCode?: string | null,
  nextTierPoints?: number | null
): { percent: number; nextLabel: string | null; remaining: number } {
  const idx = TIER_LADDER.findIndex((t) => t.code === tierCode);
  const current = idx >= 0 ? TIER_LADDER[idx] : TIER_LADDER[0];
  const next =
    idx >= 0 && idx < TIER_LADDER.length - 1
      ? TIER_LADDER[idx + 1]
      : null;
  const ceiling = nextTierPoints ?? next?.minPoints ?? current.minPoints + 1;
  const floor = current.minPoints;
  const span = Math.max(1, ceiling - floor);
  const percent = Math.min(100, Math.max(0, ((points - floor) / span) * 100));
  return {
    percent,
    nextLabel: next?.label ?? null,
    remaining: Math.max(0, ceiling - points),
  };
}
