import { useCallback, useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import { sfx } from "@/game/audio";
import { MEDALS, medalFor, type Medal, type ScoreEntry } from "@/game/storage";

/* ------------------------------------------------------------------ atoms */

export function BirdMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 40" className={className} aria-hidden="true">
      <path d="M12 18 2 12l3 8-3 6 10-4z" fill="#b32a4d" stroke="#08131d" strokeWidth="2.4" strokeLinejoin="round" />
      <ellipse cx="24" cy="21" rx="17" ry="13.5" fill="#ffd166" stroke="#08131d" strokeWidth="3" />
      <ellipse cx="25" cy="26" rx="11" ry="6.4" fill="#fff3d0" />
      <ellipse cx="19" cy="23" rx="11" ry="7" fill="#ef476f" stroke="#08131d" strokeWidth="2.6" transform="rotate(-14 19 23)" />
      <path d="M36 19l10 3-10 5z" fill="#f4813f" stroke="#08131d" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="31" cy="15" r="5.2" fill="#fffdf5" stroke="#08131d" strokeWidth="2.2" />
      <circle cx="32.6" cy="15.2" r="2.4" fill="#08131d" />
      <circle cx="33.5" cy="14.3" r="0.9" fill="#fff" />
    </svg>
  );
}

export function MedalBadge({ medal, size = 56 }: { medal: Medal; size?: number }) {
  const id = `mg-${medal.key}`;
  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 56 63" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={medal.shine} />
          <stop offset="55%" stopColor={medal.color} />
          <stop offset="100%" stopColor={medal.dark} />
        </linearGradient>
      </defs>
      <path d="M18 2 14 26h9l4-24zM38 2l4 24h-9l-4-24z" fill="#e76f51" stroke="#08131d" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="28" cy="40" r="21" fill={`url(#${id})`} stroke="#08131d" strokeWidth="3.4" />
      <circle cx="28" cy="40" r="14.5" fill="none" stroke="rgba(8,19,29,0.32)" strokeWidth="2.4" />
      <path d="M17 30a15 15 0 0 1 12-4" stroke="rgba(255,255,255,0.75)" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path
        d="M28 31.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9-4.3-4.1 5.9-.8z"
        fill="rgba(8,19,29,0.45)"
      />
    </svg>
  );
}

function Rivets() {
  return (
    <>
      {[
        "left-2 top-2",
        "right-2 top-2",
        "left-2 bottom-2",
        "right-2 bottom-2",
      ].map((pos) => (
        <span
          key={pos}
          className={cn(
            "pointer-events-none absolute h-[1.6cqw] w-[1.6cqw] rounded-full bg-cream-200/25 ring-1 ring-black/50",
            pos,
          )}
        />
      ))}
    </>
  );
}

export function Panel({
  children,
  className,
  ribbon,
  ribbonTone = "jade",
}: {
  children: React.ReactNode;
  className?: string;
  ribbon?: string;
  ribbonTone?: "jade" | "ember" | "sun";
}) {
  const tones = {
    jade: "bg-jade-500 text-dusk-950",
    ember: "bg-ember-500 text-cream-100",
    sun: "bg-sun-500 text-dusk-950",
  } as const;
  return (
    <div
      className={cn(
        "panel-notch pop-in relative border-[0.55cqw] border-cream-200/25 bg-dusk-900/94",
        "shadow-[0_2.5cqw_6cqw_-1.5cqw_rgba(0,0,0,0.9),inset_0_0.25cqw_0_rgba(255,243,214,0.14)]",
        "backdrop-blur-[2px]",
        className,
      )}
    >
      <Rivets />
      {ribbon && (
        <div
          className={cn(
            "absolute -top-[2.4cqw] left-1/2 -translate-x-1/2 whitespace-nowrap px-[3cqw] py-[0.7cqw]",
            "font-display text-[2.9cqw] uppercase tracking-[0.14em] panel-notch border-[0.4cqw] border-dusk-950/70",
            tones[ribbonTone],
          )}
        >
          {ribbon}
        </div>
      )}
      {children}
    </div>
  );
}

export function ArcadeButton({
  children,
  onClick,
  tone = "sun",
  className,
  size = "md",
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "sun" | "jade" | "ghost";
  className?: string;
  size?: "sm" | "md";
}) {
  const tones = {
    sun: "bg-sun-500 text-dusk-950 border-dusk-950 shadow-[0_0.9cqw_0_#a35f22]",
    jade: "bg-jade-500 text-dusk-950 border-dusk-950 shadow-[0_0.9cqw_0_#12564d]",
    ghost: "bg-dusk-800/80 text-cream-200 border-cream-200/25 shadow-[0_0.9cqw_0_rgba(0,0,0,0.55)]",
  } as const;
  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        e.currentTarget.blur();
        sfx.unlock();
        onClick();
      }}
      className={cn(
        "panel-notch font-display uppercase tracking-[0.08em] border-[0.5cqw] transition-transform duration-100",
        "hover:brightness-110 active:translate-y-[0.55cqw] active:shadow-none cursor-pointer",
        size === "md" ? "px-[3.4cqw] py-[1.7cqw] text-[3.4cqw]" : "px-[2.4cqw] py-[1.1cqw] text-[2.6cqw]",
        tones[tone],
        className,
      )}
    >
      {children}
    </button>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-[0.6cqw] border-[0.35cqw] border-cream-200/25 bg-dusk-800 px-[1.2cqw] py-[0.25cqw] font-body text-[2.5cqw] font-semibold text-cream-200">
      {children}
    </kbd>
  );
}

/* ------------------------------------------------------------------ start */

export function StartOverlay({ best, onBegin }: { best: number; onBegin: () => void }) {
  return (
    <div
      className="absolute inset-0 z-20 flex cursor-pointer flex-col items-center justify-between px-[6cqw] pb-[5cqw] pt-[7cqw]"
      onPointerDown={(e) => {
        e.preventDefault();
        onBegin();
      }}
    >
      <div className="w-full text-center">
        <p className="font-display text-[2.5cqw] uppercase tracking-[0.42em] text-jade-300/85">
          Twilight Ridge
        </p>
        <div className="mt-[1.5cqw] flex items-center justify-center gap-[2cqw]">
          <BirdMark className="bob h-[11cqw] w-auto drop-shadow-[0_0.6cqw_0_rgba(8,19,29,0.8)]" />
          <h1 className="font-display leading-[0.86]">
            <span className="block text-[13cqw] text-cream-100 text-outline drop-shadow-[0_0.9cqw_0_rgba(8,19,29,0.9)]">
              FLAPPY
            </span>
            <span
              className="block text-[13cqw] text-transparent"
              style={{ WebkitTextStroke: "0.55cqw #f4a259" }}
            >
              BIRD
            </span>
          </h1>
        </div>
      </div>

      <div className="flex flex-col items-center gap-[2.2cqw]">
        <div className="relative flex items-center justify-center">
          <span className="ring-out absolute h-[16cqw] w-[16cqw] rounded-full border-[0.5cqw] border-sun-500/60" />
          <span className="tap-pulse panel-notch border-[0.5cqw] border-dusk-950 bg-sun-500 px-[4.5cqw] py-[2cqw] font-display text-[4.2cqw] uppercase tracking-[0.06em] text-dusk-950 shadow-[0_1cqw_0_#a35f22]">
            Tap to fly
          </span>
        </div>
        <div className="flex items-center gap-[1.6cqw] text-cream-200/75">
          <Key>Space</Key>
          <span className="font-body text-[2.6cqw]">flap</span>
          <Key>P</Key>
          <span className="font-body text-[2.6cqw]">pause</span>
          <Key>R</Key>
          <span className="font-body text-[2.6cqw]">restart</span>
        </div>
      </div>

      <div className="flex w-full items-center justify-center gap-[2cqw]">
        <div className="panel-notch flex items-baseline gap-[1.6cqw] border-[0.4cqw] border-sun-500/40 bg-dusk-950/70 px-[3cqw] py-[1.2cqw]">
          <span className="font-display text-[2.6cqw] uppercase tracking-[0.2em] text-sun-400">Best</span>
          <span className="font-display text-[5cqw] leading-none text-cream-100">{best}</span>
        </div>
        {best >= MEDALS[1].min && (
          <div className="panel-notch flex items-center gap-[1.4cqw] border-[0.4cqw] border-jade-400/35 bg-dusk-950/70 px-[2.4cqw] py-[1.2cqw]">
            <MedalBadge medal={medalFor(best)} size={26} />
            <span className="font-display text-[2.4cqw] uppercase tracking-[0.14em] text-jade-300">
              {medalFor(best).label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ pause */

export function PauseOverlay({
  score,
  onResume,
  onRestart,
  muted,
  onToggleMute,
}: {
  score: number;
  onResume: () => void;
  onRestart: () => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-30 flex cursor-pointer items-center justify-center bg-dusk-950/72 backdrop-blur-[3px]"
      onPointerDown={(e) => {
        e.preventDefault();
        onResume();
      }}
    >
      <Panel ribbon="Standby" ribbonTone="sun" className="w-[74%] px-[5cqw] pb-[4.5cqw] pt-[5cqw]">
        <h2 className="text-center font-display text-[9cqw] leading-none text-cream-100 text-outline">
          PAUSED
        </h2>
        <p className="mt-[1.6cqw] text-center font-body text-[3cqw] text-cream-200/70">
          Score in flight <span className="font-display text-sun-400">{score}</span>
        </p>
        <div className="mt-[3.4cqw] flex justify-center gap-[2cqw]">
          <ArcadeButton onClick={onResume} tone="sun">
            Resume
          </ArcadeButton>
          <ArcadeButton onClick={onRestart} tone="ghost">
            Restart
          </ArcadeButton>
        </div>
        <div className="mt-[3cqw] flex items-center justify-center gap-[2cqw]">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className="panel-notch cursor-pointer border-[0.4cqw] border-cream-200/25 bg-dusk-800/80 px-[2.4cqw] py-[1cqw] font-body text-[2.7cqw] font-semibold text-cream-200 transition hover:border-jade-400/60"
          >
            Sound: {muted ? "Off" : "On"}
          </button>
          <span className="font-body text-[2.6cqw] text-cream-200/50">
            <Key>P</Key> or tap anywhere
          </span>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------- record */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function RecordEntry({
  rank,
  score,
  onSave,
  onSkip,
  onLettersChange,
}: {
  rank: number;
  score: number;
  onSave: (initials: string) => void;
  onSkip: () => void;
  onLettersChange: (letters: string) => void;
}) {
  const [letters, setLetters] = useState(() => "YOU".split(""));
  const [slot, setSlot] = useState(0);

  useEffect(() => {
    onLettersChange(letters.join(""));
  }, [letters, onLettersChange]);

  const bump = useCallback(
    (dir: number) => {
      setLetters((prev) => {
        const next = [...prev];
        const i = ALPHABET.indexOf(next[slot]);
        next[slot] = ALPHABET[(i + dir + ALPHABET.length) % ALPHABET.length];
        return next;
      });
    },
    [slot],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", " ", "Space"].includes(k)) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (k === "ArrowUp" || k === "w" || k === "W") bump(1);
      else if (k === "ArrowDown" || k === "s" || k === "S") bump(-1);
      else if (k === "ArrowLeft" || k === "a" || k === "A") setSlot((s) => (s + 2) % 3);
      else if (k === "ArrowRight" || k === "d" || k === "D") setSlot((s) => (s + 1) % 3);
      else if (k === " " || k === "Space") {
        bump(1);
        setSlot((s) => (s + 1) % 3);
      } else if (k === "Enter") onSave(letters.join(""));
      else if (/^[a-zA-Z0-9]$/.test(k)) {
        setLetters((prev) => {
          const next = [...prev];
          next[slot] = k.toUpperCase();
          return next;
        });
        setSlot((s) => (s + 1) % 3);
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [bump, letters, onSave, slot]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-dusk-950/78 backdrop-blur-[3px]">
      <Panel ribbon="New record" ribbonTone="ember" className="w-[86%] px-[5cqw] pb-[4.5cqw] pt-[5.5cqw]">
        <p className="text-center font-display text-[3cqw] uppercase tracking-[0.24em] text-jade-300">
          Entering at #{rank + 1} · {score} pts
        </p>
        <div className="mt-[3.5cqw] flex items-center justify-center gap-[2.4cqw]">
          {letters.map((l, i) => (
            <div key={i} className="flex flex-col items-center gap-[1cqw]">
              <button
                type="button"
                aria-label="previous letter"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  setSlot(i);
                  bump(1);
                }}
                className="cursor-pointer font-display text-[3.6cqw] leading-none text-sun-400 transition hover:text-cream-100"
              >
                ▲
              </button>
              <span
                className={cn(
                  "panel-notch flex h-[13cqw] w-[11cqw] items-center justify-center border-[0.5cqw] font-display text-[7cqw] transition-colors",
                  i === slot
                    ? "border-sun-500 bg-sun-500 text-dusk-950"
                    : "border-cream-200/25 bg-dusk-800 text-cream-100",
                )}
              >
                {l}
              </span>
              <button
                type="button"
                aria-label="next letter"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  setSlot(i);
                  bump(-1);
                }}
                className="cursor-pointer font-display text-[3.6cqw] leading-none text-sun-400 transition hover:text-cream-100"
              >
                ▼
              </button>
            </div>
          ))}
        </div>
        <div className="mt-[3.6cqw] flex items-center justify-center gap-[2cqw]">
          <ArcadeButton onClick={() => onSave(letters.join(""))} tone="jade">
            Save score
          </ArcadeButton>
          <ArcadeButton onClick={onSkip} tone="ghost" size="sm">
            Skip
          </ArcadeButton>
        </div>
        <p className="mt-[2.6cqw] text-center font-body text-[2.5cqw] text-cream-200/55">
          <Key>←</Key> <Key>→</Key> slot · <Key>↑</Key> <Key>↓</Key> letter · <Key>Enter</Key> save ·
          typing works too
        </p>
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------- game over */

export function GameOverOverlay({
  score,
  best,
  shaves,
  newRecord,
  scores,
  onRetry,
  onBackdrop,
  onMenu,
}: {
  score: number;
  best: number;
  shaves: number;
  newRecord: boolean;
  scores: ScoreEntry[];
  onRetry: () => void;
  onBackdrop: () => void;
  onMenu: () => void;
}) {
  const medal = medalFor(score);
  const beat = newRecord && score > 0;
  return (
    <div
      className="absolute inset-0 z-20 flex cursor-pointer items-center justify-center bg-dusk-950/68 px-[5cqw] backdrop-blur-[2px]"
      onPointerDown={(e) => {
        e.preventDefault();
        onBackdrop();
      }}
    >
      <Panel ribbon="Game over" ribbonTone="ember" className="relative w-full px-[5cqw] pb-[4cqw] pt-[5.5cqw]">
        {beat && (
          <div className="pop-in absolute -right-[2cqw] -top-[3cqw] z-10 -rotate-[11deg] panel-notch border-[0.45cqw] border-dashed border-berry-500 bg-dusk-950/85 px-[2.2cqw] py-[0.9cqw] font-display text-[2.7cqw] uppercase tracking-[0.12em] text-berry-500">
            New best!
          </div>
        )}

        <div className="flex items-center justify-between gap-[3cqw]">
          <div>
            <p className="font-display text-[2.5cqw] uppercase tracking-[0.28em] text-cream-200/55">
              Score
            </p>
            <p className="font-display text-[15cqw] leading-[0.85] text-cream-100 text-outline">
              {score}
            </p>
          </div>
          <div className="flex flex-col items-center">
            <MedalBadge medal={medal} size={62} />
            <span className="mt-[0.6cqw] font-display text-[2.3cqw] uppercase tracking-[0.16em] text-jade-300">
              {medal.label}
            </span>
          </div>
        </div>

        <div className="mt-[3cqw] grid grid-cols-3 gap-[1.6cqw]">
          {[
            { k: "Best", v: best },
            { k: "Close shaves", v: shaves },
            { k: "On board", v: scores.length ? `#${Math.max(1, scores.findIndex((s) => s.score >= score) + 1) || 1}` : "—" },
          ].map((s) => (
            <div
              key={s.k}
              className="panel-notch border-[0.35cqw] border-cream-200/15 bg-dusk-950/60 px-[1.6cqw] py-[1.2cqw] text-center"
            >
              <p className="font-body text-[2.2cqw] uppercase tracking-[0.14em] text-cream-200/50">
                {s.k}
              </p>
              <p className="font-display text-[4cqw] leading-tight text-sun-400">{s.v}</p>
            </div>
          ))}
        </div>

        <div className="mt-[3.4cqw] flex items-center justify-center gap-[2cqw]">
          <ArcadeButton onClick={onRetry} tone="sun">
            Fly again
          </ArcadeButton>
          <ArcadeButton onClick={onMenu} tone="ghost" size="sm">
            Title
          </ArcadeButton>
        </div>
        <p className="mt-[2.4cqw] text-center font-body text-[2.5cqw] text-cream-200/50">
          <Key>Space</Key> or tap anywhere to restart instantly
        </p>
      </Panel>
    </div>
  );
}
