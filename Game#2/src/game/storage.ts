export type MedalKey = "tin" | "bronze" | "silver" | "gold" | "platinum";

export interface Medal {
  key: MedalKey;
  label: string;
  min: number;
  color: string;
  shine: string;
  dark: string;
}

export const MEDALS: Medal[] = [
  { key: "tin", label: "Fledgling", min: 0, color: "#8fa6b4", shine: "#d5e3ea", dark: "#4d6472" },
  { key: "bronze", label: "Bronze", min: 10, color: "#cd7f32", shine: "#f2c08a", dark: "#7d4a17" },
  { key: "silver", label: "Silver", min: 22, color: "#c9d4da", shine: "#ffffff", dark: "#77878f" },
  { key: "gold", label: "Gold", min: 38, color: "#f4b740", shine: "#fff0b3", dark: "#a06f10" },
  { key: "platinum", label: "Platinum", min: 60, color: "#7fe3d4", shine: "#e6fffb", dark: "#2b8f83" },
];

export function medalFor(score: number): Medal {
  let out = MEDALS[0];
  for (const m of MEDALS) if (score >= m.min) out = m;
  return out;
}

export interface ScoreEntry {
  initials: string;
  score: number;
  medal: MedalKey;
  ts: number;
}

const SCORES_KEY = "duskflap.scores.v1";
const MUTE_KEY = "duskflap.muted.v1";
export const TABLE_SIZE = 5;

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked — run stays in-memory */
  }
}

export function loadScores(): ScoreEntry[] {
  const raw = safeGet(SCORES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.score === "number" && Number.isFinite(e.score))
      .map((e) => ({
        initials: String(e.initials ?? "???").slice(0, 3).toUpperCase(),
        score: Math.max(0, Math.floor(e.score)),
        medal: (MEDALS.some((m) => m.key === e.medal) ? e.medal : "tin") as MedalKey,
        ts: Number(e.ts) || Date.now(),
      }))
      .sort((a, b) => b.score - a.score || a.ts - b.ts);
  } catch {
    return [];
  }
}

export function persistScores(list: ScoreEntry[]): ScoreEntry[] {
  const sorted = [...list].sort((a, b) => b.score - a.score || a.ts - b.ts).slice(0, TABLE_SIZE);
  safeSet(SCORES_KEY, JSON.stringify(sorted));
  return sorted;
}

/** Returns the rank (0-based) the score would take, or -1 if it misses the table. */
export function rankFor(score: number, list: ScoreEntry[]): number {
  if (score <= 0) return -1;
  if (list.length < TABLE_SIZE) {
    const i = list.findIndex((e) => score > e.score);
    return i === -1 ? list.length : i;
  }
  return score > list[TABLE_SIZE - 1].score ? list.findIndex((e) => score > e.score) : -1;
}

export function bestScore(list: ScoreEntry[]): number {
  return list.length ? list[0].score : 0;
}

export function clearScores(): ScoreEntry[] {
  try {
    window.localStorage.removeItem(SCORES_KEY);
  } catch {
    /* ignore */
  }
  return [];
}

export function loadMuted(): boolean {
  return safeGet(MUTE_KEY) === "1";
}

export function saveMuted(muted: boolean) {
  safeSet(MUTE_KEY, muted ? "1" : "0");
}
