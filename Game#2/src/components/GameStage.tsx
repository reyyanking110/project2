import { useCallback, useEffect, useRef, useState } from "react";
import { sfx } from "@/game/audio";
import { FlappyGame, type Snapshot } from "@/game/engine";
import { rankFor, type ScoreEntry } from "@/game/storage";
import { cn } from "@/utils/cn";
import { GameOverOverlay, PauseOverlay, RecordEntry, StartOverlay } from "./Overlays";

interface Props {
  scores: ScoreEntry[];
  best: number;
  muted: boolean;
  onToggleMute: () => void;
  onSubmitScore: (initials: string, score: number) => void;
  onRunComplete: (score: number, shaves: number) => void;
}

const INITIAL: Snapshot = {
  phase: "ready",
  score: 0,
  best: 0,
  shaves: 0,
  newRecord: false,
  justLanded: false,
};

export default function GameStage({
  scores,
  best,
  muted,
  onToggleMute,
  onSubmitScore,
  onRunComplete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const flashRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<FlappyGame | null>(null);

  const [snap, setSnap] = useState<Snapshot>(INITIAL);
  const [entry, setEntry] = useState<{ rank: number; score: number } | null>(null);
  const lettersRef = useRef("YOU");

  // live prop mirror so the engine's callbacks never go stale
  const propsRef = useRef({ scores, best, muted, onToggleMute, onSubmitScore, onRunComplete });
  propsRef.current = { scores, best, muted, onToggleMute, onSubmitScore, onRunComplete };

  /* ---------------------------------------------------------- lifecycle */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new FlappyGame(canvas, {
      onSnapshot: (s) => setSnap(s),
      onToggleMute: () => propsRef.current.onToggleMute(),
    });
    game.best = propsRef.current.best;
    game.setFxTargets(frameRef.current, flashRef.current);
    gameRef.current = game;
    // warm the canvas at its real size once layout settles
    requestAnimationFrame(() => game.setFxTargets(frameRef.current, flashRef.current));
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (gameRef.current) gameRef.current.best = best;
  }, [best]);

  useEffect(() => {
    sfx.setMuted(muted);
  }, [muted]);

  /* ---------------------------------------------------- run-end handling */
  useEffect(() => {
    const game = gameRef.current;
    if (snap.phase !== "over") {
      // leaving the game-over screen always releases the input lock
      setEntry((e) => (e ? null : e));
      if (game) game.lockInput = false;
      return;
    }
    if (!game) return;
    propsRef.current.onRunComplete(snap.score, snap.shaves);
    const rank = rankFor(snap.score, propsRef.current.scores);
    if (rank >= 0 && snap.score > 0) {
      lettersRef.current = "YOU";
      game.lockInput = true;
      setEntry({ rank, score: snap.score });
      sfx.record();
    } else {
      game.lockInput = false;
      setEntry(null);
    }
  }, [snap.phase, snap.score]);

  const commit = useCallback(
    (initials: string, score: number) => {
      propsRef.current.onSubmitScore(initials, score);
      setEntry(null);
      if (gameRef.current) gameRef.current.lockInput = false;
    },
    [],
  );

  const onLettersChange = useCallback((l: string) => {
    lettersRef.current = l;
  }, []);

  /** explicit button — always restarts */
  const retry = useCallback(() => {
    if (entry) {
      commit(lettersRef.current, entry.score);
      return;
    }
    gameRef.current?.restart();
  }, [commit, entry]);

  /** backdrop tap — routed through the engine so the post-death lockout applies */
  const retryTap = useCallback(() => {
    if (entry) return;
    gameRef.current?.primary();
  }, [entry]);

  /* ------------------------------------------------------------ controls */
  const phase = snap.phase;

  return (
    <div className="relative flex items-center justify-center">
      <div
        ref={frameRef}
        style={{ containerType: "size" }}
        className="game-frame grain no-touch relative select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* cabinet bezel */}
        <div className="absolute -inset-[1.1cqw] rounded-[4.2cqw] border-[0.5cqw] border-dusk-700/80 bg-gradient-to-b from-dusk-800 to-dusk-950 shadow-[0_3cqw_7cqw_-2cqw_rgba(0,0,0,0.95)]" />
        <div className="absolute -inset-[1.1cqw] rounded-[4.2cqw] ring-1 ring-sun-500/20" />

        <div className="absolute inset-0 overflow-hidden rounded-[3cqw] bg-dusk-950">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Flappy Bird play field — tap or press space to flap"
            className="no-touch absolute inset-0 h-full w-full"
          />

          {/* impact flash */}
          <div
            ref={flashRef}
            className="pointer-events-none absolute inset-0 z-10 bg-cream-100 opacity-0 mix-blend-overlay"
          />
          {/* soft top shade for HUD legibility */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[16%] bg-gradient-to-b from-dusk-950/55 to-transparent" />
          <div className="scanlines pointer-events-none absolute inset-0 z-10 opacity-40" />

          {/* corner controls */}
          <div className="absolute right-[2.4cqw] top-[2.4cqw] z-40 flex flex-col gap-[1.4cqw]">
            <IconButton
              label={muted ? "Unmute" : "Mute"}
              onClick={onToggleMute}
              active={!muted}
            >
              {muted ? (
                <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
                  <path d="M17 9l4 6M21 9l-4 6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
                  <path d="M16.5 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" />
                </svg>
              )}
            </IconButton>
            <IconButton
              label="Pause"
              onClick={() => gameRef.current?.togglePause()}
              active={phase === "playing" || phase === "paused"}
              hidden={phase !== "playing" && phase !== "paused"}
            >
              {phase === "paused" ? (
                <svg viewBox="0 0 24 24" className="h-full w-full" fill="currentColor">
                  <path d="M7 4.5l13 7.5-13 7.5z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-full w-full" fill="currentColor">
                  <rect x="6" y="4" width="4.4" height="16" rx="1.2" />
                  <rect x="13.6" y="4" width="4.4" height="16" rx="1.2" />
                </svg>
              )}
            </IconButton>
          </div>

          {phase === "ready" && !entry && (
            <StartOverlay best={best} onBegin={() => gameRef.current?.primary()} />
          )}

          {phase === "paused" && (
            <PauseOverlay
              score={snap.score}
              onResume={() => gameRef.current?.resume()}
              onRestart={() => gameRef.current?.restart()}
              muted={muted}
              onToggleMute={onToggleMute}
            />
          )}

          {entry && (
            <RecordEntry
              rank={entry.rank}
              score={entry.score}
              onLettersChange={onLettersChange}
              onSave={(initials) => commit(initials, entry.score)}
              onSkip={() => commit(lettersRef.current, entry.score)}
            />
          )}

          {phase === "over" && !entry && (
            <GameOverOverlay
              score={snap.score}
              best={best}
              shaves={snap.shaves}
              newRecord={snap.newRecord}
              scores={scores}
              onRetry={retry}
              onBackdrop={retryTap}
              onMenu={() => gameRef.current?.toMenu()}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  active,
  hidden,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  hidden?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        e.currentTarget.blur();
        sfx.unlock();
        onClick();
      }}
      className={cn(
        "panel-notch no-touch grid h-[7cqw] w-[7cqw] cursor-pointer place-items-center border-[0.4cqw] p-[1.5cqw] transition-all duration-150",
        active
          ? "border-cream-200/30 bg-dusk-900/80 text-cream-200 hover:border-jade-400/70 hover:text-jade-300"
          : "border-cream-200/15 bg-dusk-900/60 text-cream-200/45 hover:text-cream-200/80",
        hidden && "pointer-events-none opacity-0",
      )}
    >
      {children}
    </button>
  );
}
