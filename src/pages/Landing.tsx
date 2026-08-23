import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { store } from "../lib/store";

// A live, voice-reactive-feeling orb drawn on canvas for the hero.
function HeroOrb() {
  const ref = useRef<HTMLCanvasElement>(null);
  const particles = useRef<{ x: number; y: number; vx: number; vy: number; s: number; a: number; hue: number }[]>([]);
  const t = useRef(0);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = (canvas.width = 420);
    const h = (canvas.height = 420);
    const cx = w / 2, cy = h / 2;
    particles.current = Array.from({ length: 260 }, () => ({
      x: cx, y: cy,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      s: Math.random() * 3 + 1,
      a: Math.random() * 0.6 + 0.2,
      hue: 265 + Math.random() * 60,
    }));
    let raf = 0;
    const loop = () => {
      t.current += 0.016;
      ctx.clearRect(0, 0, w, h);
      const pulse = 0.6 + 0.4 * Math.sin(t.current * 2.2);
      // outer glow
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200 + pulse * 20);
      glow.addColorStop(0, `rgba(212,168,67,${0.35 * pulse})`);
      glow.addColorStop(0.5, `rgba(127,91,212,${0.22 * pulse})`);
      glow.addColorStop(1, "rgba(10,10,25,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      // orb body
      const orb = ctx.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, 150);
      orb.addColorStop(0, "rgba(70,45,110,0.95)");
      orb.addColorStop(0.4, "rgba(35,20,60,0.9)");
      orb.addColorStop(1, "rgba(12,8,28,1)");
      ctx.beginPath();
      ctx.arc(cx, cy, 150, 0, Math.PI * 2);
      ctx.fillStyle = orb;
      ctx.fill();
      // particles swirling
      particles.current.forEach((p) => {
        const dx = p.x - cx, dy = p.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const ang = Math.atan2(dy, dx) + 0.015 * pulse;
        const nd = Math.min(dist + 0.2, 135);
        p.x = cx + Math.cos(ang) * nd;
        p.y = cy + Math.sin(ang) * nd;
        const pa = 0.15 + 0.45 * Math.abs(Math.sin(t.current * 2 + p.x * 0.05)) * pulse;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s * (0.7 + pulse * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},70%,60%,${pa})`;
        ctx.fill();
      });
      // rotating ring
      ctx.beginPath();
      ctx.arc(cx, cy, 146 + Math.sin(t.current * 8) * 3 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(212,168,67,${0.55 * pulse})`;
      ctx.lineWidth = 2 + pulse * 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 158 + Math.cos(t.current * 6) * 3 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(150,100,220,${0.3 * pulse})`;
      ctx.lineWidth = 1 + pulse;
      ctx.stroke();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="hero-orb-canvas" width={420} height={420} aria-label="A glowing magical crystal orb" role="img" />;
}

const FEATURES = [
  { icon: "🎙️", title: "Voice-First Play", desc: "Speak to the orb. It listens, narrates back in a warm voice, and the crystal pulses with every word. No typing, no controls." },
  { icon: "🔮", title: "The Living Orb", desc: "A crystal orb is your Game Master's face. It glows gold for treasure, flashes red for combat, and breathes as it tells the story." },
  { icon: "🎨", title: "Build Your Hero", desc: "A guided 5-step wizard: class, species, name, avatar, and a starter item. Your hero appears in a burst of magic." },
  { icon: "🗝️", title: "Quest Codes", desc: "Every adventure has a 6-character code. Friends and family join from any device in seconds." },
  { icon: "🛡️", title: "Kid-Safe by Design", desc: "Built for ages 7-13 with a COPPA consent gate and age tiers. Warm, encouraging, and never scary." },
  { icon: "📖", title: "Stories That Remember", desc: "Sessions save automatically. Characters grow, the world remembers, and every recap sets up the next cliffhanger." },
];

const STEPS = [
  { n: "01", title: "Create a Quest", desc: "Name your world, pick an age tier, and get your Quest Code." },
  { n: "02", title: "Build Heroes", desc: "Each player crafts their adventurer with the guided wizard." },
  { n: "03", title: "Gather the Party", desc: "Share the code. Everyone joins from any device, no account needed." },
  { n: "04", title: "Speak and Play", desc: "Press to talk. The Quest Master narrates, the orb glows, the adventure unfolds." },
  { n: "05", title: "Continue Anytime", desc: "Sessions save. Pick up right where you left off." },
];

export function Landing() {
  const signedIn = !!store.getCurrentUser();
  const cta = signedIn ? (
    <Link to="/dashboard" className="qm-btn qm-btn-gold qm-btn-lg">Return to Your Quests</Link>
  ) : (
    <Link to="/signup" className="qm-btn qm-btn-gold qm-btn-lg">Begin Your Adventure Free</Link>
  );
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="container qm-nav">
          <div className="logo">
            <span className="logo-orb">◉</span>
            <span className="logo-text">Quest <span className="logo-ai">Master</span></span>
          </div>
          <nav className="nav-links">
            <Link to="/login" className="qm-btn qm-btn-ghost">Sign In</Link>
            {!signedIn && <Link to="/signup" className="qm-btn qm-btn-gold">Start Free</Link>}
          </nav>
        </div>
      </header>

      <main className="landing-main">
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="hero-orb-wrap"><HeroOrb /></div>
              <h1 className="hero-title">A Magic Game Master in a Crystal Orb</h1>
              <p className="hero-tagline">Speak, and the orb answers. Voice-powered adventures for kids and families, where every story is safe, warm, and unforgettable. No prep, no dice math, no grown-up needed.</p>
              <div className="hero-cta">
                {cta}
                <a href="#how" className="qm-btn qm-btn-ghost qm-btn-lg">See How It Works</a>
              </div>
              <div className="safety-badge">
                <span>🛡️</span> COPPA-safe <span className="dot">·</span> Kid-friendly ages 7-13 <span className="dot">·</span> Parent-approved
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="features">
          <div className="container">
            <h2 className="section-title">Why Families Love Quest Master</h2>
            <div className="features-grid">
              {FEATURES.map((f) => (
                <div className="card feature-card" key={f.title}>
                  <div className="feature-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="how-it-works">
          <div className="container">
            <h2 className="section-title">How It Works</h2>
            <div className="steps">
              {STEPS.map((s) => (
                <div className="step" key={s.n}>
                  <div className="step-number">{s.n}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="container cta-inner">
            <h2>Ready for Your First Adventure?</h2>
            <p>Your first session is free. No credit card required.</p>
            {cta}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="container">
          <p>Quest Master © 2026. Voice-powered adventures for families. An AI Game Master.</p>
        </div>
      </footer>
    </div>
  );
}
