import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import { MEDALS, medalFor, type ScoreEntry } from "@/game/storage";

function Card({
  title,
  kicker,
  children,
  className,
}: {
  title: string;
  kicker?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-xl border border-cream-200/12 bg-dusk-900/70 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]",
        className,
      )}
    >
      <header className="flex items-baseline justify-between gap-2 border-b border-cream-200/10 bg-dusk-850/80 px-4 py-2.5">
        <h2 className="font-display text-[0.78rem] uppercase tracking-[0.2em] text-cream-100">
          {title}
        </h2>
        {kicker && (
          <span className="font-body text-[0.66rem] uppercase tracking-[0.18em] text-jade-300/70">
            {kicker}
          </span>
        )}
      </header>
      <div className="px-4 py-3.5">{children}</div>
    </section>
  );
}

export function BestPlate({ best, shavesBest }: { best: number; shavesBest: number }) {
  const medal = medalFor(best);
  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <div className="glow-breathe absolute -inset-3 rounded-full bg-sun-500/25 blur-xl" />
        <p className="relative font-display text-[3.4rem] leading-[0.8] text-cream-100 text-outline">
          {best}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-body text-[0.66rem] uppercase tracking-[0.28em] text-cream-200/50">
          Personal best
        </p>
        <p className="mt-1 flex items-center gap-2 font-display text-[0.8rem] uppercase tracking-[0.14em]" style={{ color: medal.color }}>
          <span
            className="inline-block h-2.5 w-2.5 rotate-45"
            style={{ background: medal.color, boxShadow: `0 0 10px ${medal.color}` }}
          />
          {medal.label}
        </p>
        <p className="mt-1.5 font-body text-xs text-cream-200/45">
          {shavesBest > 0
            ? `${shavesBest} close shave${shavesBest === 1 ? "" : "s"} this session`
            : "Skim a pipe edge for a close shave"}
        </p>
      </div>
    </div>
  );
}

export function ScoreTable({
  scores,
  highlightTs,
}: {
  scores: ScoreEntry[];
  highlightTs?: number | null;
}) {
  if (!scores.length) {
    return (
      <p className="py-3 text-center font-body text-sm text-cream-200/45">
        No flights logged yet.
        <br />
        <span className="text-[0.78rem] text-cream-200/30">Beat a pipe to claim slot #1.</span>
      </p>
    );
  }
  return (
    <ol className="space-y-1.5">
      {scores.map((s, i) => {
        const medal = MEDALS.find((m) => m.key === s.medal) ?? medalFor(s.score);
        const fresh = highlightTs === s.ts;
        return (
          <li
            key={`${s.ts}-${i}`}
            className={cn(
              "group flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-all duration-200",
              fresh
                ? "border-sun-500/70 bg-sun-500/12 slide-up"
                : i === 0
                  ? "border-jade-400/25 bg-jade-500/8"
                  : "border-cream-200/8 bg-dusk-950/40",
              "hover:translate-x-1 hover:border-cream-200/25",
            )}
          >
            <span
              className={cn(
                "w-5 shrink-0 text-center font-display text-[0.72rem]",
                i === 0 ? "text-sun-400" : "text-cream-200/35",
              )}
            >
              {i + 1}
            </span>
            <span
              className="h-4 w-4 shrink-0 rotate-45 rounded-[3px] ring-1 ring-black/40"
              style={{ background: medal.color }}
              title={medal.label}
            />
            <span className="min-w-0 flex-1 truncate font-display text-[0.82rem] tracking-[0.12em] text-cream-100">
              {s.initials}
            </span>
            <span className="font-body text-[0.66rem] text-cream-200/35">
              {new Date(s.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
            <span className="w-9 shrink-0 text-right font-display text-[0.95rem] text-cream-100">
              {s.score}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function MedalLegend() {
  return (
    <ul className="grid grid-cols-5 gap-1.5">
      {MEDALS.map((m) => (
        <li key={m.key} className="group text-center">
          <div
            className="mx-auto h-6 w-6 rounded-full ring-2 ring-black/40 transition-transform duration-200 group-hover:scale-110"
            style={{ background: `linear-gradient(140deg, ${m.shine}, ${m.color} 55%, ${m.dark})` }}
          />
          <p className="mt-1 font-body text-[0.6rem] uppercase leading-tight tracking-[0.08em] text-cream-200/45">
            {m.min}+
          </p>
        </li>
      ))}
    </ul>
  );
}

const CONTROLS: [string, string][] = [
  ["Space / W / ↑", "Flap"],
  ["Tap / Click", "Flap (touch)"],
  ["P / Esc", "Pause & resume"],
  ["R", "Instant restart"],
  ["M", "Mute audio"],
];

export function ControlsCard() {
  return (
    <ul className="space-y-1.5">
      {CONTROLS.map(([k, v]) => (
        <li key={k} className="flex items-center justify-between gap-3">
          <kbd className="rounded border border-cream-200/20 bg-dusk-950/70 px-2 py-0.5 font-body text-[0.68rem] font-semibold tracking-wide text-cream-200/85">
            {k}
          </kbd>
          <span className="font-body text-[0.78rem] text-cream-200/50">{v}</span>
        </li>
      ))}
    </ul>
  );
}

export function ResetButton({ onReset }: { onReset: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3200);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      onClick={() => {
        if (armed) {
          onReset();
          setArmed(false);
        } else setArmed(true);
      }}
      className={cn(
        "w-full rounded-lg border px-3 py-2 font-body text-[0.72rem] font-semibold uppercase tracking-[0.16em] transition-colors",
        armed
          ? "border-berry-500/70 bg-berry-500/15 text-berry-500"
          : "border-cream-200/12 bg-dusk-950/40 text-cream-200/45 hover:border-ember-500/50 hover:text-ember-500",
      )}
    >
      {armed ? "Tap again to wipe" : "Clear flight log"}
    </button>
  );
}

export { Card };
