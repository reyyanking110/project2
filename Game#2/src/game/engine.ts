import { sfx } from "./audio";

export const VIEW_W = 480;
export const VIEW_H = 720;

export type Phase = "ready" | "playing" | "dying" | "over" | "paused";

export interface Snapshot {
  phase: Phase;
  score: number;
  best: number;
  shaves: number;
  newRecord: boolean;
  justLanded: boolean;
}

interface Pipe {
  x: number;
  cy: number;
  gap: number;
  scored: boolean;
  glow: number;
}

type PKind = "feather" | "spark" | "dust" | "ring" | "star";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  rot: number;
  vr: number;
  g: number;
  drag: number;
  color: string;
  kind: PKind;
}

interface FloatText {
  x: number;
  y: number;
  vy: number;
  life: number;
  max: number;
  text: string;
  color: string;
  size: number;
}

/* ---------- tuning ---------- */
const GROUND_H = 96;
const FLOOR_Y = VIEW_H - GROUND_H;
const BIRD_X = 142;
const HIT_R = 11.5;
const GRAVITY = 1820;
const FLAP_VY = -472;
const MAX_FALL = 790;
const PIPE_W = 78;
const CAP_H = 28;
const CAP_OVER = 7;
const MIN_SPACING = 216;
const BASE_SPEED = 202;
const MAX_SPEED = 282;
const BASE_GAP = 188;
const MIN_GAP = 148;
const READY_SPEED = BASE_SPEED * 0.45;
const STEP = 1 / 120;

const C = {
  ink: "#08131d",
  skyTop: "#0a1a2b",
  skyMid: "#164257",
  skyLow: "#2f7a7d",
  glow: "#f6a95c",
  hillFar: "#1b4a5e",
  hillMid: "#123543",
  tree: "#0b242f",
  grass: "#3f9a72",
  grassLit: "#7ed9a4",
  dirt: "#8a5a3b",
  dirtDark: "#5f3b25",
  pipeA: "#155e55",
  pipeB: "#37b7a1",
  pipeC: "#0e4239",
  birdBody: "#ffd166",
  birdBelly: "#fff3d0",
  birdWing: "#ef476f",
  birdWingDark: "#b32a4d",
  beak: "#f4813f",
  cream: "#fff3d6",
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

function circleRect(cx: number, cy: number, r: number, x: number, y: number, w: number, h: number) {
  const nx = clamp(cx, x, x + w);
  const ny = clamp(cy, y, y + h);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export interface EngineHooks {
  onSnapshot: (s: Snapshot) => void;
  onToggleMute?: () => void;
}

export class FlappyGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hooks: EngineHooks;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private alive = true;

  private sx = 1;
  private sy = 1;
  private ro: ResizeObserver | null = null;

  /* fx targets driven imperatively (no React re-render per frame) */
  private shakeEl: HTMLElement | null = null;
  private flashEl: HTMLElement | null = null;

  phase: Phase = "ready";
  score = 0;
  best = 0;
  shaves = 0;
  newRecord = false;
  lockInput = false;

  private time = 0;
  private scroll = 0;
  private speed = BASE_SPEED;
  private hitStop = 0;
  private shake = 0;
  private flash = 0;
  private punch = 0;
  private scorePop = 0;
  private deadTimer = 0;
  private landed = false;
  private justLanded = false;
  private heat = 0;

  private bird = {
    y: VIEW_H * 0.44,
    vy: 0,
    rot: 0,
    wingPhase: 0,
    wingSpeed: 9,
    flapT: 1,
    blink: 2,
    blinking: 0,
  };

  private pipes: Pipe[] = [];
  private parts: Particle[] = [];
  private texts: FloatText[] = [];
  private trail: { x: number; y: number; r: number; a: number }[] = [];
  private trailAcc = 0;

  /* decor */
  private stars: { x: number; y: number; r: number; p: number }[] = [];
  private clouds: { x: number; y: number; s: number; v: number; a: number }[] = [];
  private trees: { x: number; h: number; w: number }[] = [];
  private hillSeed = Math.random() * 100;
  private groundTile: HTMLCanvasElement | null = null;
  private skyGrad: CanvasGradient | null = null;
  private sunGrad: CanvasGradient | null = null;
  private vigGrad: CanvasGradient | null = null;
  private pipeGrad: CanvasGradient | null = null;
  private capGrad: CanvasGradient | null = null;

  constructor(canvas: HTMLCanvasElement, hooks: EngineHooks) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D canvas unsupported");
    this.ctx = ctx;
    this.hooks = hooks;
    this.buildDecor();
    this.resize();
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas);
    }
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onBlur);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  setFxTargets(shakeEl: HTMLElement | null, flashEl: HTMLElement | null) {
    this.shakeEl = shakeEl;
    this.flashEl = flashEl;
  }

  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onBlur);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    if (this.shakeEl) this.shakeEl.style.transform = "";
  }

  /* ============================================================= setup */

  private buildDecor() {
    this.stars = Array.from({ length: 46 }, () => ({
      x: rnd(0, VIEW_W),
      y: rnd(6, 320),
      r: rnd(0.7, 1.9),
      p: rnd(0, Math.PI * 2),
    }));
    this.clouds = Array.from({ length: 7 }, () => ({
      x: rnd(-60, VIEW_W + 120),
      y: rnd(70, 380),
      s: rnd(0.55, 1.5),
      v: rnd(6, 20),
      a: rnd(0.07, 0.2),
    }));
    this.trees = Array.from({ length: 40 }, () => ({
      x: 0,
      h: rnd(34, 76),
      w: rnd(18, 34),
    }));
  }

  private resize = () => {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || VIEW_W;
    const h = rect.height || VIEW_H;
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.sx = (w / VIEW_W) * dpr;
    this.sy = (h / VIEW_H) * dpr;

    const ctx = this.ctx;
    const sky = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
    sky.addColorStop(0, C.skyTop);
    sky.addColorStop(0.42, C.skyMid);
    sky.addColorStop(0.78, C.skyLow);
    sky.addColorStop(1, "#59937f");
    this.skyGrad = sky;

    const sun = ctx.createRadialGradient(348, 372, 6, 348, 372, 210);
    sun.addColorStop(0, "rgba(255,214,150,0.95)");
    sun.addColorStop(0.22, "rgba(246,169,92,0.55)");
    sun.addColorStop(0.55, "rgba(231,111,81,0.16)");
    sun.addColorStop(1, "rgba(231,111,81,0)");
    this.sunGrad = sun;

    const vig = ctx.createRadialGradient(
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.34,
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.78,
    );
    vig.addColorStop(0, "rgba(4,10,16,0)");
    vig.addColorStop(1, "rgba(4,10,16,0.62)");
    this.vigGrad = vig;

    const pg = ctx.createLinearGradient(0, 0, PIPE_W, 0);
    pg.addColorStop(0, C.pipeC);
    pg.addColorStop(0.16, C.pipeA);
    pg.addColorStop(0.44, C.pipeB);
    pg.addColorStop(0.72, "#218d7c");
    pg.addColorStop(1, C.pipeC);
    this.pipeGrad = pg;

    const cg = ctx.createLinearGradient(0, 0, PIPE_W + CAP_OVER * 2, 0);
    cg.addColorStop(0, C.pipeC);
    cg.addColorStop(0.18, C.pipeA);
    cg.addColorStop(0.46, "#4ccab2");
    cg.addColorStop(0.74, "#1d7f70");
    cg.addColorStop(1, C.pipeC);
    this.capGrad = cg;

    this.groundTile = this.buildGroundTile();
  };

  private buildGroundTile() {
    const tile = document.createElement("canvas");
    tile.width = 64;
    tile.height = GROUND_H;
    const t = tile.getContext("2d");
    if (!t) return tile;
    t.fillStyle = C.dirt;
    t.fillRect(0, 0, 64, GROUND_H);
    const dg = t.createLinearGradient(0, 0, 0, GROUND_H);
    dg.addColorStop(0, "rgba(255,220,170,0.16)");
    dg.addColorStop(0.35, "rgba(0,0,0,0)");
    dg.addColorStop(1, "rgba(0,0,0,0.42)");
    t.fillStyle = dg;
    t.fillRect(0, 0, 64, GROUND_H);
    // grit
    for (let i = 0; i < 70; i++) {
      t.fillStyle = Math.random() > 0.5 ? "rgba(255,236,205,0.10)" : "rgba(48,26,14,0.22)";
      const s = rnd(1, 3.4);
      t.fillRect(rnd(0, 64), rnd(14, GROUND_H), s, s);
    }
    // grass cap
    t.fillStyle = C.grass;
    t.fillRect(0, 0, 64, 16);
    t.fillStyle = C.grassLit;
    t.fillRect(0, 0, 64, 4);
    t.fillStyle = "rgba(9,40,28,0.5)";
    t.fillRect(0, 15, 64, 3);
    // blades
    for (let i = 0; i < 9; i++) {
      const x = rnd(0, 62);
      t.strokeStyle = i % 2 ? C.grassLit : "#2f7d5c";
      t.lineWidth = 2;
      t.beginPath();
      t.moveTo(x, 16);
      t.quadraticCurveTo(x + rnd(-4, 4), 8, x + rnd(-7, 7), 3);
      t.stroke();
    }
    // pebbles
    t.fillStyle = "rgba(255,240,215,0.16)";
    for (let i = 0; i < 5; i++) {
      t.beginPath();
      t.ellipse(rnd(4, 60), rnd(28, GROUND_H - 12), rnd(2, 5), rnd(1.5, 3), 0, 0, Math.PI * 2);
      t.fill();
    }
    return tile;
  }

  /* ============================================================= input */

  private onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    sfx.unlock();
    this.primary();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.code;
    if (["Space", "ArrowUp", "KeyW", "Enter", "ArrowDown", "KeyP", "KeyR", "KeyM"].includes(k)) {
      e.preventDefault();
    }
    if (e.repeat) return;
    sfx.unlock();

    if (k === "KeyM") {
      // "M" doubles as an initial during name entry — don't hijack it there
      if (!this.lockInput) this.hooks.onToggleMute?.();
      return;
    }
    if (k === "KeyR") {
      if (this.phase !== "ready" && !this.lockInput) this.restart();
      return;
    }
    if (k === "KeyP" || k === "Escape") {
      this.togglePause();
      return;
    }
    if (k === "Space" || k === "ArrowUp" || k === "KeyW" || k === "Enter") this.primary();
  };

  private onBlur = () => {
    if (document.hidden && this.phase === "playing") this.pause();
    else if (this.phase === "playing" && document.hasFocus() === false) this.pause();
  };

  /** Space / tap / click — context sensitive primary action. */
  primary() {
    sfx.unlock();
    if (this.lockInput) return;
    switch (this.phase) {
      case "ready":
        this.startRun();
        break;
      case "playing":
        this.flap();
        break;
      case "paused":
        this.resume();
        break;
      case "over":
        if (this.deadTimer > 0.35) this.restart();
        break;
      case "dying":
        break;
    }
  }

  private flap() {
    this.bird.vy = FLAP_VY;
    this.bird.flapT = 0;
    this.bird.wingPhase = 0;
    this.bird.wingSpeed = 30;
    this.punch = Math.max(this.punch, 0.35);
    sfx.flap();
    for (let i = 0; i < 7; i++) {
      this.spawn({
        x: BIRD_X - 10 + rnd(-6, 6),
        y: this.bird.y + rnd(2, 12),
        vx: rnd(-120, -30),
        vy: rnd(-10, 90),
        life: rnd(0.3, 0.62),
        size: rnd(1.6, 4.2),
        g: 130,
        drag: 2.4,
        color: i % 3 === 0 ? C.cream : "rgba(255,240,214,0.75)",
        kind: i % 4 === 0 ? "feather" : "dust",
      });
    }
  }

  startRun() {
    this.resetWorld();
    this.phase = "playing";
    this.bird.vy = FLAP_VY * 0.86;
    this.bird.flapT = 0;
    this.bird.wingPhase = 0;
    this.bird.wingSpeed = 30;
    this.spawn({
      x: BIRD_X - 6,
      y: this.bird.y + 12,
      vx: -70,
      vy: 60,
      life: 0.5,
      size: 5,
      g: 90,
      drag: 2,
      color: "rgba(255,240,214,0.7)",
      kind: "dust",
    });
    sfx.flap();
    this.emit();
  }

  restart() {
    sfx.ui(true);
    this.startRun();
  }

  toMenu() {
    this.resetWorld();
    this.phase = "ready";
    this.newRecord = false;
    sfx.ui(false);
    this.emit();
  }

  pause() {
    if (this.phase !== "playing") return;
    this.phase = "paused";
    sfx.ui(false);
    this.emit();
  }

  resume() {
    if (this.phase !== "paused") return;
    this.phase = "playing";
    this.last = performance.now();
    this.acc = 0;
    sfx.ui(true);
    this.emit();
  }

  togglePause() {
    sfx.unlock();
    if (this.phase === "playing") this.pause();
    else if (this.phase === "paused") this.resume();
  }

  private resetWorld() {
    this.pipes = [];
    this.parts = [];
    this.texts = [];
    this.trail = [];
    this.trailAcc = 0;
    this.score = 0;
    this.shaves = 0;
    this.newRecord = false;
    this.speed = BASE_SPEED;
    this.hitStop = 0;
    this.shake = 0;
    this.flash = 0;
    this.punch = 0;
    this.scorePop = 0;
    this.deadTimer = 0;
    this.landed = false;
    this.justLanded = false;
    this.heat = 0;
    this.bird.y = VIEW_H * 0.44;
    this.bird.vy = 0;
    this.bird.rot = 0;
    this.bird.flapT = 1;
    this.bird.wingPhase = 0;
  }

  private emit() {
    this.hooks.onSnapshot({
      phase: this.phase,
      score: this.score,
      best: this.best,
      shaves: this.shaves,
      newRecord: this.newRecord,
      justLanded: this.justLanded,
    });
    this.justLanded = false;
  }

  /* ============================================================= loop */

  private loop = (t: number) => {
    if (!this.alive) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min((t - this.last) / 1000, 0.05);
    this.last = t;
    if (this.phase !== "paused") {
      this.acc += dt;
      let guard = 0;
      while (this.acc >= STEP && guard++ < 8) {
        this.update(STEP);
        this.acc -= STEP;
      }
      if (guard >= 8) this.acc = 0;
    }
    this.render();
    this.applyFx();
  };

  private update(dt: number) {
    this.time += dt;
    this.shake *= Math.exp(-8.5 * dt);
    if (this.shake < 0.06) this.shake = 0;
    this.flash = Math.max(0, this.flash - dt * 3.4);
    this.punch *= Math.exp(-11 * dt);
    this.scorePop = Math.max(0, this.scorePop - dt * 3.2);

    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }

    const p = this.phase;
    if (p === "ready") {
      this.scroll += READY_SPEED * dt;
      this.updateClouds(dt, READY_SPEED);
      this.bird.y = VIEW_H * 0.44 + Math.sin(this.time * 2.5) * 12;
      this.bird.rot = Math.sin(this.time * 2.5 + 0.6) * 0.14;
      this.bird.flapT = Math.min(1, this.bird.flapT + dt * 3);
    } else if (p === "playing") {
      this.speed = Math.min(MAX_SPEED, BASE_SPEED + this.score * 2.5);
      this.scroll += this.speed * dt;
      this.updateClouds(dt, this.speed);
      this.updateBirdPlay(dt);
      this.updatePipes(dt);
      this.trailAcc += dt;
      if (this.trailAcc >= 1 / 48) {
        this.trailAcc = 0;
        this.trail.unshift({ x: BIRD_X, y: this.bird.y, r: 10, a: 0.2 });
        if (this.trail.length > 12) this.trail.pop();
      }
    } else if (p === "dying") {
      this.deadTimer += dt;
      this.bird.vy = Math.min(this.bird.vy + GRAVITY * 1.05 * dt, MAX_FALL);
      this.bird.y += this.bird.vy * dt;
      if (this.bird.y + HIT_R >= FLOOR_Y) {
        this.bird.y = FLOOR_Y - HIT_R;
        this.bird.vy = 0;
        if (!this.landed) {
          this.landed = true;
          this.bird.rot = Math.PI / 2;
          this.shake = Math.max(this.shake, 9);
          this.landingBurst();
          sfx.land();
        }
      } else {
        this.bird.rot += dt * 7.5;
      }
      if (this.deadTimer > (this.landed ? 0.55 : 1.7)) this.gameOver();
    } else if (p === "over") {
      this.deadTimer += dt;
      this.updateClouds(dt, 0);
    }

    this.updateParticles(dt);
    this.updateTexts(dt);
    this.bird.flapT = Math.min(1, this.bird.flapT + dt * 3.4);
    const wingTarget =
      this.phase === "playing"
        ? this.bird.vy < 40
          ? 24
          : 9
        : this.phase === "ready"
          ? 11
          : 1.5;
    this.bird.wingSpeed += (wingTarget - this.bird.wingSpeed) * Math.min(1, dt * 9);
    this.bird.wingPhase += this.bird.wingSpeed * dt;
    this.bird.blink -= dt;
    if (this.bird.blink < -0.13) this.bird.blink = rnd(2.2, 5);
    this.bird.blinking = this.bird.blink < 0 ? 1 : 0;
  }

  private updateClouds(dt: number, worldSpeed: number) {
    for (const c of this.clouds) {
      c.x -= (c.v + worldSpeed * 0.06) * dt;
      if (c.x < -140) {
        c.x = VIEW_W + rnd(20, 160);
        c.y = rnd(60, 380);
        c.s = rnd(0.55, 1.5);
      }
    }
  }

  private updateBirdPlay(dt: number) {
    const b = this.bird;
    b.vy = Math.min(b.vy + GRAVITY * dt, MAX_FALL);
    b.y += b.vy * dt;

    // soft ceiling bonk — forgiving, but it costs you momentum
    if (b.y < HIT_R + 6) {
      b.y = HIT_R + 6;
      if (b.vy < -60) {
        this.shake = Math.max(this.shake, 5);
        sfx.bonk();
        for (let i = 0; i < 6; i++)
          this.spawn({
            x: BIRD_X + rnd(-12, 12),
            y: b.y - 6,
            vx: rnd(-90, 90),
            vy: rnd(30, 150),
            life: rnd(0.25, 0.5),
            size: rnd(1.4, 3),
            g: 200,
            drag: 1.6,
            color: "#ffe9a8",
            kind: "star",
          });
      }
      b.vy = Math.max(b.vy, 30);
    }

    const target = clamp(-0.5 + (b.vy / MAX_FALL) * 1.9, -0.55, 1.4);
    b.rot += (target - b.rot) * Math.min(1, dt * 13);

    if (b.y + HIT_R >= FLOOR_Y) {
      b.y = FLOOR_Y - HIT_R;
      this.kill(true);
    }
  }

  private updatePipes(dt: number) {
    if (this.phase !== "playing") return;
    const spacing = Math.max(MIN_SPACING, this.speed * 1.16);
    const last = this.pipes[this.pipes.length - 1];
    if (!last || last.x < VIEW_W - spacing) this.spawnPipe(spacing);

    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i];
      p.x -= this.speed * dt;
      p.glow = Math.max(0, p.glow - dt * 2.6);
      if (p.x + PIPE_W + 30 < 0) {
        this.pipes.splice(i, 1);
        continue;
      }
      if (!p.scored && p.x + PIPE_W < BIRD_X - HIT_R) {
        p.scored = true;
        this.onScore(p);
      }
      if (this.collides(p)) {
        this.kill(false);
        return;
      }
    }
  }

  private spawnPipe(spacing: number) {
    const prev = this.pipes[this.pipes.length - 1];
    const gap = Math.max(MIN_GAP, BASE_GAP - this.score * 1.35);
    const minC = 108 + gap * 0.16;
    const maxC = FLOOR_Y - 108 - gap * 0.16;
    let cy = rnd(minC, maxC);
    if (prev) {
      for (let i = 0; i < 10; i++) {
        if (Math.abs(cy - prev.cy) <= 160) break;
        cy = rnd(minC, maxC);
      }
      cy = clamp(cy, prev.cy - 172, prev.cy + 172);
      cy = clamp(cy, minC, maxC);
    }
    const x = prev ? prev.x + spacing : VIEW_W + 44;
    this.pipes.push({ x, cy, gap, scored: false, glow: 0 });
  }

  private collides(p: Pipe) {
    const top = p.cy - p.gap / 2;
    const bot = p.cy + p.gap / 2;
    const y = this.bird.y;
    return (
      circleRect(BIRD_X, y, HIT_R, p.x, -60, PIPE_W, top + 60) ||
      circleRect(BIRD_X, y, HIT_R, p.x, bot, PIPE_W, VIEW_H - bot + 60) ||
      circleRect(BIRD_X, y, HIT_R, p.x - CAP_OVER, top - CAP_H, PIPE_W + CAP_OVER * 2, CAP_H) ||
      circleRect(BIRD_X, y, HIT_R, p.x - CAP_OVER, bot, PIPE_W + CAP_OVER * 2, CAP_H)
    );
  }

  private onScore(p: Pipe) {
    this.score++;
    this.scorePop = 1;
    this.punch = Math.max(this.punch, 0.85);
    this.shake = Math.max(this.shake, 2.6);
    p.glow = 1;
    this.heat = Math.min(1, this.score / 45);

    if (this.score % 10 === 0) {
      // milestone: the ridge heats up and the pace steps up
      this.shake = Math.max(this.shake, 7.5);
      this.punch = 1;
      this.flash = Math.max(this.flash, 0.3);
      sfx.record();
      this.texts.push({
        x: VIEW_W / 2,
        y: VIEW_H * 0.3,
        vy: -32,
        life: 1.2,
        max: 1.2,
        text: "FASTER!",
        color: "#ffb37a",
        size: 28,
      });
      this.spawn({
        x: VIEW_W / 2,
        y: VIEW_H * 0.34,
        vx: 0,
        vy: 0,
        life: 0.6,
        size: 30,
        g: 0,
        drag: 0,
        color: "#f4a259",
        kind: "ring",
      });
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        this.spawn({
          x: VIEW_W / 2 + Math.cos(a) * 40,
          y: VIEW_H * 0.34 + Math.sin(a) * 40,
          vx: Math.cos(a) * rnd(120, 260),
          vy: Math.sin(a) * rnd(120, 260),
          life: rnd(0.4, 0.8),
          size: rnd(1.6, 3.4),
          g: 90,
          drag: 1.8,
          color: i % 2 ? "#ffd166" : "#9ff3e0",
          kind: "spark",
        });
      }
    }

    const top = p.cy - p.gap / 2;
    const bot = p.cy + p.gap / 2;
    const margin = Math.min(this.bird.y - top, bot - this.bird.y) - HIT_R;
    const tight = margin < 13;

    if (tight) {
      this.shaves++;
      this.shake = Math.max(this.shake, 5.5);
      sfx.squeak();
      for (let i = 0; i < 16; i++)
        this.spawn({
          x: BIRD_X + rnd(-8, 8),
          y: this.bird.y + rnd(-10, 10),
          vx: rnd(-220, 220),
          vy: rnd(-220, 220),
          life: rnd(0.22, 0.5),
          size: rnd(1.2, 2.8),
          g: 60,
          drag: 2.6,
          color: i % 2 ? "#ffe9a8" : "#9ff3e0",
          kind: "spark",
        });
      this.texts.push({
        x: BIRD_X + 26,
        y: this.bird.y - 26,
        vy: -46,
        life: 0.85,
        max: 0.85,
        text: "CLOSE!",
        color: "#ffe9a8",
        size: 17,
      });
    } else {
      sfx.score(Math.min(this.score, 12));
    }

    this.texts.push({
      x: BIRD_X + 30,
      y: this.bird.y - 6,
      vy: -54,
      life: 0.7,
      max: 0.7,
      text: "+1",
      color: tight ? "#9ff3e0" : "rgba(255,243,214,0.9)",
      size: tight ? 22 : 18,
    });

    this.spawn({
      x: BIRD_X,
      y: this.bird.y,
      vx: 0,
      vy: 0,
      life: 0.42,
      size: 14,
      g: 0,
      drag: 0,
      color: tight ? "#9ff3e0" : "#fff3d6",
      kind: "ring",
    });
    for (let i = 0; i < 9; i++) {
      const a = rnd(0, Math.PI * 2);
      this.spawn({
        x: BIRD_X,
        y: this.bird.y,
        vx: Math.cos(a) * rnd(60, 190),
        vy: Math.sin(a) * rnd(60, 190),
        life: rnd(0.3, 0.6),
        size: rnd(1.6, 3.6),
        g: 120,
        drag: 2.2,
        color: i % 3 === 0 ? "#ffd166" : "#fff3d6",
        kind: "spark",
      });
    }
    this.emit();
  }

  private kill(onGround: boolean) {
    if (this.phase !== "playing") return;
    this.phase = "dying";
    this.deadTimer = 0;
    this.landed = onGround;
    this.hitStop = onGround ? 0.05 : 0.11;
    this.shake = onGround ? 16 : 24;
    this.flash = onGround ? 0.5 : 0.85;
    this.bird.vy = onGround ? -120 : -230;
    sfx.hit();
    sfx.die();

    const burst = onGround ? 14 : 26;
    for (let i = 0; i < burst; i++) {
      const a = rnd(0, Math.PI * 2);
      this.spawn({
        x: BIRD_X + rnd(-8, 8),
        y: this.bird.y + rnd(-8, 8),
        vx: Math.cos(a) * rnd(50, 330),
        vy: Math.sin(a) * rnd(50, 330) - 90,
        life: rnd(0.5, 1.35),
        size: rnd(3, 7.5),
        g: 460,
        drag: 1.1,
        color: i % 3 === 0 ? C.birdWing : i % 3 === 1 ? C.birdBody : C.cream,
        kind: "feather",
      });
    }
    for (let i = 0; i < 12; i++) {
      const a = rnd(0, Math.PI * 2);
      this.spawn({
        x: BIRD_X,
        y: this.bird.y,
        vx: Math.cos(a) * rnd(120, 380),
        vy: Math.sin(a) * rnd(120, 380),
        life: rnd(0.18, 0.4),
        size: rnd(1.5, 3.4),
        g: 40,
        drag: 3,
        color: "#ffd9a0",
        kind: "spark",
      });
    }
    if (onGround) this.landingBurst();
    this.emit();
  }

  private landingBurst() {
    for (let i = 0; i < 18; i++)
      this.spawn({
        x: BIRD_X + rnd(-22, 22),
        y: FLOOR_Y + rnd(-4, 6),
        vx: rnd(-190, 190),
        vy: rnd(-190, -30),
        life: rnd(0.35, 0.85),
        size: rnd(2, 5.5),
        g: 620,
        drag: 1.2,
        color: i % 2 ? C.dirt : C.grass,
        kind: "dust",
      });
  }

  private gameOver() {
    this.phase = "over";
    this.deadTimer = 0;
    this.justLanded = true;
    this.newRecord = this.score > this.best;
    if (this.newRecord) this.best = this.score;
    this.emit();
  }

  private spawn(p: Partial<Particle> & { x: number; y: number }) {
    if (this.parts.length > 260) this.parts.shift();
    this.parts.push({
      x: p.x,
      y: p.y,
      vx: p.vx ?? 0,
      vy: p.vy ?? 0,
      life: p.life ?? 0.5,
      max: p.life ?? 0.5,
      size: p.size ?? 3,
      rot: rnd(0, Math.PI * 2),
      vr: rnd(-9, 9),
      g: p.g ?? 300,
      drag: p.drag ?? 1,
      color: p.color ?? "#fff",
      kind: p.kind ?? "spark",
    });
  }

  private updateParticles(dt: number) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.parts.splice(i, 1);
        continue;
      }
      if (p.kind !== "ring") {
        p.vy += p.g * dt;
        const d = Math.exp(-p.drag * dt);
        p.vx *= d;
        p.vy *= p.kind === "feather" ? Math.exp(-1.6 * dt) : d;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.kind === "feather") {
          p.x += Math.sin(p.life * 9 + p.rot) * 26 * dt;
        }
        if (p.y > FLOOR_Y && p.kind !== "spark" && p.kind !== "star") {
          p.y = FLOOR_Y;
          p.vy *= -0.32;
          p.vx *= 0.7;
          if (Math.abs(p.vy) < 24) p.vy = 0;
        }
      }
    }
  }

  private updateTexts(dt: number) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= Math.exp(-2.4 * dt);
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  private applyFx() {
    if (this.shakeEl) {
      if (this.shake > 0.05) {
        const s = this.shake;
        const x = rnd(-s, s);
        const y = rnd(-s, s);
        const r = rnd(-s, s) * 0.16;
        this.shakeEl.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${r.toFixed(3)}deg)`;
      } else if (this.shakeEl.style.transform) {
        this.shakeEl.style.transform = "";
      }
    }
    if (this.flashEl) {
      const o = this.flash.toFixed(3);
      if (this.flashEl.style.opacity !== o) this.flashEl.style.opacity = o;
    }
  }

  /* ============================================================= render */

  private render() {
    const ctx = this.ctx;
    ctx.setTransform(this.sx, 0, 0, this.sy, 0, 0);
    const zoom = 1 + this.punch * 0.045;
    if (zoom !== 1) {
      ctx.translate(VIEW_W / 2, VIEW_H / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-VIEW_W / 2, -VIEW_H / 2);
    }

    this.drawSky(ctx);
    this.drawStars(ctx);
    this.drawSun(ctx);
    this.drawHills(ctx);
    this.drawClouds(ctx);
    this.drawTreeLine(ctx);
    for (const p of this.pipes) this.drawPipe(ctx, p);
    this.drawGround(ctx);
    this.drawTrail(ctx);
    this.drawBird(ctx);
    this.drawParticles(ctx);
    this.drawTexts(ctx);
    this.drawHud(ctx);

    if (this.heat > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.heat * 0.15;
      ctx.fillStyle = "#e76f51";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.restore();
    }

    if (this.vigGrad) {
      ctx.fillStyle = this.vigGrad;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  private drawSky(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.skyGrad ?? C.skyTop;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  private drawStars(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const s of this.stars) {
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.time * 1.6 + s.p));
      ctx.globalAlpha = tw * (1 - s.y / 400) * 0.9;
      ctx.fillStyle = "#fff6e0";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawSun(ctx: CanvasRenderingContext2D) {
    if (this.sunGrad) {
      ctx.fillStyle = this.sunGrad;
      ctx.fillRect(120, 150, 460, 440);
    }
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#ffd9a0";
    ctx.beginPath();
    ctx.arc(348, 372, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#fff2d6";
    ctx.beginPath();
    ctx.arc(348, 372, 58 + Math.sin(this.time * 1.4) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawHills(ctx: CanvasRenderingContext2D) {
    this.drawRidge(ctx, this.scroll * 0.06 + this.hillSeed, 452, 78, C.hillFar, 0.9);
    this.drawRidge(ctx, this.scroll * 0.13 + this.hillSeed * 2.3, 500, 56, C.hillMid, 1);
  }

  private drawRidge(
    ctx: CanvasRenderingContext2D,
    off: number,
    base: number,
    amp: number,
    color: string,
    alpha: number,
  ) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, VIEW_H);
    const stepSize = 12;
    for (let x = 0; x <= VIEW_W + stepSize; x += stepSize) {
      const w = (x + off) * 0.011;
      const y =
        base -
        amp *
          (0.55 * Math.sin(w) + 0.3 * Math.sin(w * 2.3 + 1.7) + 0.18 * Math.sin(w * 4.1 + 0.4));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(VIEW_W, VIEW_H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawClouds(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const c of this.clouds) {
      ctx.globalAlpha = c.a;
      ctx.fillStyle = "#ffd7b0";
      const s = c.s;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 46 * s, 15 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x + 26 * s, c.y - 9 * s, 30 * s, 15 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x - 28 * s, c.y - 5 * s, 24 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawTreeLine(ctx: CanvasRenderingContext2D) {
    const spacing = 34;
    const total = this.trees.length * spacing;
    const off = ((this.scroll * 0.3) % total + total) % total;
    ctx.save();
    ctx.fillStyle = C.tree;
    ctx.globalAlpha = 0.95;
    for (let i = 0; i < this.trees.length; i++) {
      const t = this.trees[i];
      let x = i * spacing - off;
      if (x < -60) x += total;
      if (x > VIEW_W + 60) continue;
      const baseY = FLOOR_Y + 4;
      ctx.beginPath();
      ctx.moveTo(x, baseY - t.h);
      ctx.lineTo(x + t.w * 0.5, baseY);
      ctx.lineTo(x - t.w * 0.5, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, baseY - t.h * 0.72);
      ctx.lineTo(x + t.w * 0.36, baseY - t.h * 0.1);
      ctx.lineTo(x - t.w * 0.36, baseY - t.h * 0.1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawGround(ctx: CanvasRenderingContext2D) {
    const off = ((this.scroll % 64) + 64) % 64;
    ctx.save();
    if (this.groundTile) {
      for (let x = -off; x < VIEW_W; x += 64) {
        ctx.drawImage(this.groundTile, x, FLOOR_Y, 64, GROUND_H);
      }
    } else {
      ctx.fillStyle = C.grass;
      ctx.fillRect(0, FLOOR_Y, VIEW_W, GROUND_H);
    }
    ctx.fillStyle = "rgba(6,16,24,0.35)";
    ctx.fillRect(0, FLOOR_Y + GROUND_H - 26, VIEW_W, 26);
    ctx.restore();
  }

  private drawPipe(ctx: CanvasRenderingContext2D, p: Pipe) {
    const top = p.cy - p.gap / 2;
    const bot = p.cy + p.gap / 2;
    ctx.save();
    ctx.translate(p.x, 0);
    ctx.lineJoin = "round";

    const body = (y: number, h: number) => {
      ctx.fillStyle = this.pipeGrad ?? C.pipeA;
      ctx.fillRect(0, y, PIPE_W, h);
      ctx.fillStyle = "rgba(255,255,255,0.13)";
      ctx.fillRect(11, y, 7, h);
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(PIPE_W - 18, y, 10, h);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3.5;
      ctx.strokeRect(-1.75, y, PIPE_W + 3.5, h);
    };

    const cap = (y: number) => {
      ctx.fillStyle = this.capGrad ?? C.pipeA;
      rr(ctx, -CAP_OVER, y, PIPE_W + CAP_OVER * 2, CAP_H, 7);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      rr(ctx, -CAP_OVER + 5, y + 4, PIPE_W + CAP_OVER * 2 - 22, 5, 3);
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3.5;
      rr(ctx, -CAP_OVER, y, PIPE_W + CAP_OVER * 2, CAP_H, 7);
      ctx.stroke();
    };

    body(-40, top - CAP_H + 40);
    cap(top - CAP_H);
    body(bot + CAP_H, VIEW_H - bot);
    cap(bot);

    if (p.glow > 0.01) {
      ctx.globalAlpha = p.glow * 0.85;
      ctx.strokeStyle = "#b6ffe9";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-CAP_OVER - 3, top);
      ctx.lineTo(PIPE_W + CAP_OVER + 3, top);
      ctx.moveTo(-CAP_OVER - 3, bot);
      ctx.lineTo(PIPE_W + CAP_OVER + 3, bot);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private drawTrail(ctx: CanvasRenderingContext2D) {
    if (this.phase !== "playing" || this.trail.length < 2) return;
    ctx.save();
    const n = this.trail.length;
    for (let i = n - 1; i > 0; i--) {
      const t = this.trail[i];
      const k = 1 - i / n;
      ctx.globalAlpha = 0.2 * k * k;
      ctx.fillStyle = "#ffe6ab";
      ctx.beginPath();
      ctx.arc(t.x - i * 3.2, t.y + i * 0.35, t.r * (0.35 + k * 0.65), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawBird(ctx: CanvasRenderingContext2D) {
    const b = this.bird;
    ctx.save();
    ctx.translate(BIRD_X, b.y);
    ctx.rotate(b.rot);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // tail
    ctx.fillStyle = C.birdWingDark;
    ctx.beginPath();
    ctx.moveTo(-13, -3);
    ctx.lineTo(-26, -9);
    ctx.lineTo(-24, 1);
    ctx.lineTo(-26, 8);
    ctx.lineTo(-12, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // body
    const bg = ctx.createLinearGradient(0, -15, 0, 15);
    bg.addColorStop(0, "#ffe08a");
    bg.addColorStop(0.55, C.birdBody);
    bg.addColorStop(1, "#e8a63c");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 13.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.stroke();

    // belly
    ctx.fillStyle = C.birdBelly;
    ctx.beginPath();
    ctx.ellipse(1, 5.5, 11, 6.5, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // wing
    const wingAng = Math.sin(b.wingPhase) * 0.95 - 0.15;
    const squash = 0.55 + 0.45 * Math.cos(b.wingPhase);
    ctx.save();
    ctx.translate(-3, -1);
    ctx.rotate(wingAng);
    ctx.scale(1, clamp(squash, 0.28, 1.2));
    ctx.fillStyle = C.birdWing;
    ctx.beginPath();
    ctx.ellipse(-2, 3, 12.5, 8, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.ellipse(-4, 1, 7, 3.4, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // beak
    ctx.fillStyle = C.beak;
    ctx.beginPath();
    ctx.moveTo(13, -1);
    ctx.lineTo(27, 2);
    ctx.lineTo(13, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.fillStyle = "#c85a24";
    ctx.beginPath();
    ctx.moveTo(14, 3.4);
    ctx.lineTo(25, 2.8);
    ctx.lineTo(14, 6.4);
    ctx.closePath();
    ctx.fill();

    // eye
    ctx.fillStyle = "#fffdf5";
    ctx.beginPath();
    ctx.arc(8.5, -5.5, 5.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    if (b.blinking && this.phase !== "dying" && this.phase !== "over") {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(4.4, -5.5);
      ctx.lineTo(12.6, -5.5);
      ctx.stroke();
    } else {
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(10.2, -5.4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(11.2, -6.4, 0.95, 0, Math.PI * 2);
      ctx.fill();
    }

    // death X eyes
    if (this.phase === "dying" || this.phase === "over") {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(6, -8);
      ctx.lineTo(11, -3);
      ctx.moveTo(11, -8);
      ctx.lineTo(6, -3);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.parts) {
      const t = clamp(p.life / p.max, 0, 1);
      if (p.kind === "ring") {
        ctx.globalAlpha = t * 0.7;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * t + 0.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + (1 - t) * 52, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      ctx.globalAlpha = t;
      if (p.kind === "feather") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(8,19,29,0.55)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-p.size * 1.4, 0);
        ctx.lineTo(p.size * 1.4, 0);
        ctx.stroke();
        ctx.restore();
      } else if (p.kind === "star") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          ctx.lineTo(Math.cos(a) * p.size * 1.9, Math.sin(a) * p.size * 1.9);
          ctx.lineTo(Math.cos(a + 0.5) * p.size * 0.6, Math.sin(a + 0.5) * p.size * 0.6);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.kind === "spark" ? t : 1), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawTexts(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.textAlign = "center";
    for (const t of this.texts) {
      const k = clamp(t.life / t.max, 0, 1);
      ctx.globalAlpha = Math.min(1, k * 1.8);
      ctx.font = `${t.size}px Bungee, Impact, sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = C.ink;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  private drawHud(ctx: CanvasRenderingContext2D) {
    if (this.phase === "ready") return;
    const pop = this.scorePop;
    const scale = 1 + Math.sin(Math.min(pop, 1) * Math.PI) * 0.28;
    ctx.save();
    ctx.translate(VIEW_W / 2, 106);
    ctx.scale(scale, scale);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "64px Bungee, Impact, sans-serif";
    ctx.lineWidth = 13;
    ctx.lineJoin = "round";
    ctx.strokeStyle = C.ink;
    ctx.strokeText(String(this.score), 0, 4);
    ctx.fillStyle = "rgba(8,19,29,0.55)";
    ctx.fillText(String(this.score), 0, 8);
    const g = ctx.createLinearGradient(0, -34, 0, 34);
    g.addColorStop(0, "#fffdf4");
    g.addColorStop(1, "#ffc978");
    ctx.fillStyle = g;
    ctx.fillText(String(this.score), 0, 4);
    ctx.restore();

    if (this.shaves > 0 && this.phase === "playing") {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.font = "13px Bungee, Impact, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#9ff3e0";
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 4;
      const label = `${this.shaves} CLOSE`;
      ctx.strokeText(label, VIEW_W / 2, 150);
      ctx.fillText(label, VIEW_W / 2, 150);
      ctx.restore();
    }
  }
}
