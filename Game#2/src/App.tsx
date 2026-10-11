import { useCallback, useMemo, useState } from "react";
import GameStage from "@/components/GameStage";
import { BirdMark } from "@/components/Overlays";
import {
  BestPlate,
  Card,
  ControlsCard,
  MedalLegend,
  ResetButton,
  ScoreTable,
} from "@/components/Sidebar";
import { sfx } from "@/game/audio";
import {
  bestScore,
  clearScores,
  loadMuted,
  loadScores,
  medalFor,
  persistScores,
  saveMuted,
  type ScoreEntry,
} from "@/game/storage";

function Feather({ style, scale = 1 }: { style: React.CSSProperties; scale?: number }) {
  return (
    <div className="feather pointer-events-none absolute top-0" style={style}>
      <svg width={22 * scale} height={22 * scale} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M20 3c-8 0-14 5-16 12l-1 6 6-1c7-2 12-8 12-16z"
          fill="rgba(255,225,172,0.5)"
          stroke="rgba(255,243,214,0.35)"
          strokeWidth="1"
        />
        <path d="M20 3 4 20" stroke="rgba(8,19,29,0.5)" strokeWidth="1" />
      </svg>
    </div>
  );
}

export default function App() {
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores());
  const [muted, setMuted] = useState<boolean>(() => loadMuted());
  const [highlightTs, setHighlightTs] = useState<number | null>(null);
  const [session, setSession] = useState({ runs: 0, shaves: 0, longest: 0 });

  const best = useMemo(() => bestScore(scores), [scores]);

  const feathers = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        left: `${(i * 13 + 4) % 96}%`,
        animationDuration: `${17 + ((i * 7) % 13)}s`,
        animationDelay: `${-(i * 4.3)}s`,
        scale: 0.6 + ((i * 37) % 10) / 12,
        opacity: 0.25 + ((i * 13) % 5) / 14,
      })),
    [],
  );

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      sfx.unlock();
      sfx.setMuted(next);
      saveMuted(next);
      return next;
    });
  }, []);

  const submitScore = useCallback((initials: string, score: number) => {
    const entry: ScoreEntry = {
      initials: initials.slice(0, 3).toUpperCase() || "YOU",
      score,
      medal: medalFor(score).key,
      ts: Date.now(),
    };
    setScores((prev) => persistScores([...prev, entry]));
    setHighlightTs(entry.ts);
  }, []);

  const onRunComplete = useCallback((score: number, shaves: number) => {
    setSession((s) => ({
      runs: s.runs + 1,
      shaves: Math.max(s.shaves, shaves),
      longest: Math.max(s.longest, score),
    }));
  }, []);

  const resetScores = useCallback(() => {
    setScores(clearScores());
    setHighlightTs(null);
    sfx.ui(false);
  }, []);

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-dusk-950">
      {/* ambient dusk field */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,#1b4a5e_0%,#0a1622_45%,#070f18_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[45vh] bg-[radial-gradient(90%_100%_at_50%_120%,rgba(244,162,89,0.22),transparent_70%)]" />
        <div className="absolute left-1/2 top-1/3 h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(42,157,143,0.16),transparent_65%)] blur-2xl glow-breathe" />
        <div className="scanlines absolute inset-0 opacity-[0.16]" />
        {feathers.map((f, i) => (
          <Feather key={i} style={{ left: f.left, animationDuration: f.animationDuration, animationDelay: f.animationDelay, opacity: f.opacity }} scale={f.scale} />
        ))}
      </div>

      <div className="safe-pad relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1160px] flex-col gap-5 px-3 pt-4 sm:px-6 lg:pt-6">
        {/* ---------------------------------------------------------- header */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg border border-cream-200/15 bg-dusk-900/80 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.9)] sm:h-12 sm:w-12">
              <BirdMark className="h-7 w-auto sm:h-8" />
            </div>
            <div>
              <h1 className="font-display text-[1.05rem] uppercase leading-none tracking-[0.16em] text-cream-100 sm:text-[1.3rem]">
                Duskflap
              </h1>
              <p className="mt-1 font-body text-[0.68rem] uppercase tracking-[0.26em] text-jade-300/70 sm:text-[0.72rem]">
                Twilight ridge · Flappy Bird
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-jade-400/25 bg-dusk-900/70 px-3 py-1.5 font-body text-[0.66rem] uppercase tracking-[0.18em] text-jade-300/80 sm:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jade-300 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-jade-300" />
              </span>
              120 Hz sim · 60 fps
            </span>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="grid h-10 w-10 place-items-center rounded-lg border border-cream-200/15 bg-dusk-900/80 text-cream-200/70 transition-colors hover:border-jade-400/60 hover:text-jade-300"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
                <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
                {muted ? (
                  <path d="M17 9l4 6M21 9l-4 6" />
                ) : (
                  <path d="M16.5 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" />
                )}
              </svg>
            </button>
          </div>
        </header>

        {/* ------------------------------------------------------------ main */}
        <main className="grid flex-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19.5rem] lg:gap-6">
          <GameStage
            scores={scores}
            best={best}
            muted={muted}
            onToggleMute={toggleMute}
            onSubmitScore={submitScore}
            onRunComplete={onRunComplete}
          />

          <aside className="flex flex-col gap-4">
            <Card title="Flight log" kicker="Stored locally">
              <BestPlate best={best} shavesBest={session.shaves} />
              <div className="mt-3.5 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-cream-200/10 bg-dusk-950/50 px-3 py-2">
                  <p className="font-body text-[0.6rem] uppercase tracking-[0.2em] text-cream-200/40">
                    Flights
                  </p>
                  <p className="font-display text-[1.05rem] text-cream-100">{session.runs}</p>
                </div>
                <div className="rounded-lg border border-cream-200/10 bg-dusk-950/50 px-3 py-2">
                  <p className="font-body text-[0.6rem] uppercase tracking-[0.2em] text-cream-200/40">
                    Session best
                  </p>
                  <p className="font-display text-[1.05rem] text-sun-400">{session.longest}</p>
                </div>
              </div>
            </Card>

            <Card title="Hall of flight" kicker="Top 5">
              <ScoreTable scores={scores} highlightTs={highlightTs} />
              <div className="mt-3.5 border-t border-cream-200/10 pt-3">
                <p className="mb-2 font-body text-[0.6rem] uppercase tracking-[0.24em] text-cream-200/40">
                  Medal thresholds
                </p>
                <MedalLegend />
              </div>
            </Card>

            <Card title="Cockpit" kicker="Keyboard + touch">
              <ControlsCard />
            </Card>

            <ResetButton onReset={resetScores} />
          </aside>
        </main>

        <footer className="pb-1 text-center font-body text-[0.68rem] uppercase tracking-[0.22em] text-cream-200/30">
          Built for the browser · scores never leave your device
        </footer>
      </div>
    </div>
  );
}
