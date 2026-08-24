// ============================================================================
// Quest Master — The Crystal Orb (v3 redesign)
// A diegetic crystal ball on the wizard's desk: ornate gold filigree cradle,
// glowing rune-ring, inner fog/swirl, refraction highlights, and the scene or
// enemy composited inside the sphere. Voice-reactive + state-driven.
// Matches the dark-fantasy enemy art style (deep purple/blue, gold, drama).
// ============================================================================
import { useEffect, useRef, type RefObject } from "react";
import type { Enemy } from "../lib/types";
import { getVoiceLevel } from "../lib/voice";

export interface OrbVisualState {
  speaking: boolean;
  listening: boolean;
  enemy: Enemy | null;
  events: { kind: string; at: number; id: string }[];
}

// Cache of loaded enemy art
const enemyArtCache = new Map<string, HTMLImageElement>();
function preload(path: string | undefined) {
  if (!path || enemyArtCache.has(path)) return;
  const img = new Image();
  img.onload = () => enemyArtCache.set(path, img);
  img.src = path;
}

function drawOrb(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  t: number,
  s: OrbVisualState,
  particles: { x: number; y: number; s: number; a: number; hue: number }[],
) {
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.34; // sphere radius
  const level = getVoiceLevel();

  // ---- event/state color logic -------------------------------------------
  let baseHue = s.listening ? 205 : 268;
  let react = s.speaking || level > 0.04 ? 0.55 + level * 1.3 : s.listening ? 0.35 : 0.14;
  const now = performance.now();
  const recent = s.events.filter((e) => now - e.at < 900);
  let eventHue = baseHue, flash = 0;
  for (const e of recent) {
    if (e.kind === "combat" || e.kind === "hit") { eventHue = 0; flash = Math.max(flash, 0.95); }
    else if (e.kind === "defeat") { eventHue = 42; flash = Math.max(flash, 1); }
    else if (e.kind === "heal") { eventHue = 142; flash = Math.max(flash, 0.75); }
    else if (e.kind === "treasure") { eventHue = 45; flash = Math.max(flash, 0.65); }
    else if (e.kind === "danger") { eventHue = 275; flash = Math.max(flash, 0.85); }
    else if (e.kind === "miss") { eventHue = 210; flash = Math.max(flash, 0.3); }
  }
  const hue = recent.length ? eventHue : baseHue;
  const pulse = react + flash * (1 - Math.min(1, (now - (recent[0]?.at ?? now)) / 900));

  ctx.clearRect(0, 0, W, H);

  // ---- ambient magical aura around the orb ------------------------------
  const aura = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 1.75);
  aura.addColorStop(0, `hsla(${hue},75%,58%,${0.28 * pulse})`);
  aura.addColorStop(0.45, `hsla(${hue},65%,40%,${0.13 * pulse})`);
  aura.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = aura;
  ctx.fillRect(cx - R * 1.8, cy - R * 1.8, R * 3.6, R * 3.6);

  // ---- floating sparks -----------------------------------------------------
  for (const p of particles) {
    const ang = p.x * 0.5 + t * 0.4 + p.s;
    const rad = R * (0.9 + Math.sin(ang) * 0.06) + Math.sin(t * 0.6 + p.s * 3) * 6;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang * 0.7) * rad;
    const pa = 0.15 + 0.5 * Math.abs(Math.sin(t * 1.6 + p.s * 5)) * pulse;
    ctx.beginPath();
    ctx.arc(px, py, p.s * (0.6 + pulse * 0.4), 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue},80%,66%,${pa})`;
    ctx.fill();
  }

  // ---- the crystal sphere ---------------------------------------------------
  // Outer dark glass rim
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // Inner scene area: dark depth gradient
  const sphere = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R * 0.98);
  sphere.addColorStop(0, `hsla(${(hue + 30) % 360},55%,16%,1)`);
  sphere.addColorStop(0.5, `hsla(${(hue + 12) % 360},45%,9%,1)`);
  sphere.addColorStop(1, "rgba(5,3,14,1)");
  ctx.fillStyle = sphere;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  // Enemy composite (the threat frame inside the orb) — fills the sphere
  if (s.enemy) {
    preload(s.enemy.art);
    const art = enemyArtCache.get(s.enemy.art ?? "");
    if (art && s.enemy.art) {
      // Cover the sphere with the art, then vignette so it sits inside the glass
      const bob = Math.sin(t * 1.6) * 5;
      const scl = R * 2.2; // slightly overscan to fill
      ctx.drawImage(art, cx - scl / 2, cy - scl / 2 + bob * 0.4, scl, scl);
      // Inner spherical vignette (glass depth)
      const vig = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(0.7, "rgba(0,0,0,0.25)");
      vig.addColorStop(1, "rgba(2,1,8,0.75)");
      ctx.fillStyle = vig;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      // enemy nameplate near base
      ctx.font = `bold ${Math.max(13, R * 0.13)}px Georgia, serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(242,234,216,0.95)";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 8;
      ctx.fillText(s.enemy.name, cx, cy + R * 0.72 + bob * 0.4);
      ctx.shadowBlur = 0;
    } else {
      // fallback emoji
      ctx.font = `${R * 0.9}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(s.enemy.emoji, cx, cy + Math.sin(t * 1.6) * 5);
      ctx.font = `bold ${R * 0.14}px Georgia, serif`;
      ctx.fillStyle = "rgba(242,234,216,0.95)";
      ctx.fillText(s.enemy.name, cx, cy + R * 0.72);
    }
  }

  // Inner fog/swirl — luminous cloudy wisps
  for (let i = 0; i < 5; i++) {
    const fang = t * 0.05 + i * 1.257;
    const fx = cx + Math.cos(fang) * R * 0.5;
    const fy = cy + Math.sin(fang * 1.3) * R * 0.42;
    const fr = R * (0.3 + 0.12 * Math.sin(t * 0.4 + i));
    const fog = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
    fog.addColorStop(0, `hsla(${hue},70%,62%,${0.16 * pulse})`);
    fog.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = fog;
    ctx.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
  }

  // ---- glass refraction highlights (ON TOP of the scene/enemy) -------------
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // 1) Full-sphere shading: darken toward the edges so the scene curves
  //    into a ball (the strongest cue that this is a sphere, not a flat disc).
  const shade = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.1, cx, cy, R);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(0.6, "rgba(0,0,0,0.12)");
  shade.addColorStop(0.9, "rgba(0,0,0,0.45)");
  shade.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = shade;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  // 2) Big soft sheen across upper-left (bright, reads as curved glass)
  const sheen = ctx.createRadialGradient(cx - R * 0.42, cy - R * 0.5, R * 0.05, cx - R * 0.42, cy - R * 0.5, R * 0.8);
  sheen.addColorStop(0, "rgba(255,255,255,0.65)");
  sheen.addColorStop(0.25, "rgba(255,255,255,0.2)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  // 3) Bright crescent specular arc (top-left) — the classic glass-ball highlight
  ctx.beginPath();
  ctx.ellipse(cx - R * 0.32, cy - R * 0.38, R * 0.4, R * 0.2, -0.55, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 6;
  ctx.shadowColor = "rgba(255,255,255,0.9)";
  ctx.shadowBlur = 16;
  ctx.stroke();
  ctx.shadowBlur = 0;
  // a second, smaller bright spot for double highlight
  ctx.beginPath();
  ctx.ellipse(cx - R * 0.2, cy - R * 0.5, R * 0.12, R * 0.06, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fill();

  // 4) inner magenta/purple glass edge (the crystal catching its own light)
  ctx.beginPath();
  ctx.arc(cx, cy, R - 2, 0, Math.PI * 2);
  ctx.strokeStyle = `hsla(${hue},70%,68%,0.4)`;
  ctx.lineWidth = 3;
  ctx.shadowColor = `hsla(${hue},80%,60%,0.8)`;
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Thin glass edge highlight arc (outside clip, crisp)
  ctx.beginPath();
  ctx.arc(cx, cy, R - 1.5, Math.PI * 0.15, Math.PI * 0.75);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore(); // end sphere clip

  // ---- glowing rune ring around the sphere --------------------------------
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R + 8, 0, Math.PI * 2);
  ctx.strokeStyle = `hsla(${hue},80%,62%,${0.5 + 0.3 * pulse})`;
  ctx.lineWidth = 3;
  ctx.shadowColor = `hsla(${hue},80%,60%,0.9)`;
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Rune ticks around the ring
  ctx.fillStyle = `hsla(${hue},80%,70%,${0.7 + 0.3 * pulse})`;
  const runes = 24;
  for (let i = 0; i < runes; i++) {
    const a = (i / runes) * Math.PI * 2 + t * 0.05;
    const gl = i % 3 === 0; // every 3rd rune glows brighter
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * (R + 8), cy + Math.sin(a) * (R + 8), gl ? 3.2 : 1.8, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue},80%,${gl ? 72 : 55}%,${(gl ? 0.95 : 0.5) + 0.3 * pulse})`;
    ctx.fill();
  }
  ctx.restore();

  // ---- ornate gold filigree cradle (brass/stone base) -----------------------
  ctx.save();
  // Base pedestal — dark stone + gold trim
  const baseY = cy + R + 10;
  const baseW = R * 1.7;
  const baseGrad = ctx.createLinearGradient(cx - baseW / 2, baseY, cx + baseW / 2, baseY + R * 0.5);
  baseGrad.addColorStop(0, "#8a6a2a");
  baseGrad.addColorStop(0.3, "#d4a843");
  baseGrad.addColorStop(0.5, "#6b4f1a");
  baseGrad.addColorStop(0.7, "#c89b3c");
  baseGrad.addColorStop(1, "#5a4216");
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.moveTo(cx - baseW / 2, baseY);
  ctx.lineTo(cx - baseW / 2 + R * 0.12, baseY + R * 0.5);
  ctx.lineTo(cx + baseW / 2 - R * 0.12, baseY + R * 0.5);
  ctx.lineTo(cx + baseW / 2, baseY);
  ctx.closePath();
  ctx.fill();
  // gold filigree curls holding the sphere
  ctx.strokeStyle = "rgba(230,199,106,0.9)";
  ctx.lineWidth = 4;
  ctx.shadowColor = "rgba(212,168,67,0.8)";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(cx - R * 0.62, cy + R * 0.55, R * 0.22, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + R * 0.62, cy + R * 0.55, R * 0.22, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();
  // center gem on the base
  ctx.beginPath();
  ctx.arc(cx, baseY + R * 0.18, R * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = `hsla(${hue},80%,55%,0.9)`;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // ---- flickering candlelight at the base edges ---------------------------
  const flameA = Math.sin(t * 6) * 0.05 + 0.03;
  const candleGrad = ctx.createRadialGradient(cx, baseY + R * 0.5, 0, cx, baseY + R * 0.5, R * 0.9);
  candleGrad.addColorStop(0, `rgba(212,168,67,${0.16 + flameA})`);
  candleGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = candleGrad;
  ctx.fillRect(cx - R, baseY, R * 2, R * 0.5);
}

export function CrystalOrb({
  canvasRef,
  getState,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  getState: () => OrbVisualState;
}) {
  const particles = useRef<{ x: number; y: number; s: number; a: number; hue: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.34;
    // seed particles around the sphere
    particles.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * Math.PI * 2,
      y: Math.random() * Math.PI * 2,
      s: Math.random() * 2.2 + 0.6,
      a: Math.random() * 0.5 + 0.2,
      hue: 250 + Math.random() * 60,
    }));
    let t = 0, raf = 0;
    const loop = () => {
      t += 0.016;
      // Read the LATEST state every frame via the getter (the effect closure
      // would otherwise freeze on the initial empty state forever).
      drawOrb(ctx, W, H, t, getState(), particles.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="crystal-orb"
      width={560}
      height={560}
      aria-label="The Quest Master's crystal orb"
      role="img"
    />
  );
}
