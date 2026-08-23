// ============================================================================
// Quest Master — The flagship Session screen (v3).
// Voice -> GM (Ox Alpha via OpenRouter, with deterministic fallback) ->
// resolver -> orb reactions + party hearts + transcript + speaking choices.
// Fully self-contained (localStorage), no backend.
// ============================================================================
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { store } from "../lib/store";
import type { Campaign, Character, Enemy, Exchange, GameState, QuickChoice, AgeTierId } from "../lib/types";
import { applyEffects, newGameState } from "../lib/resolver";
import { callGM, type GMResponse } from "../lib/gm";
import { ENEMY_LIBRARY, HOLLOW_MINE } from "../lib/adventure";
import { AGE_TIERS } from "../lib/types";
import {
  createRecognizer, speak, cancelSpeech, ensureAudioAnalysis,
  getVoiceLevel, speechSupported, ttsSupported, stopVoiceStream,
} from "../lib/voice";
import { useAuth } from "../hooks/useAuth";

// Module-level cache of loaded enemy art (keyed by asset path).
// The orb's continuous rAF loop reads this every frame, so once an image
// finishes loading it is picked up on the next frame automatically.
const enemyArtCache = new Map<string, HTMLImageElement>();
function preloadEnemyArt(path: string | undefined) {
  if (!path || enemyArtCache.has(path)) return;
  const img = new Image();
  img.onload = () => enemyArtCache.set(path, img);
  img.src = path;
}

// ---- Orb canvas: voice-reactive, state-driven, enemy-composited -------------
function useOrb(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  getState: () => { speaking: boolean; listening: boolean; enemies: Enemy[]; events: { kind: string; at: number; id: string }[] },
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const particles = Array.from({ length: 200 }, () => ({
      x: cx, y: cy, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      s: Math.random() * 2.6 + 1, a: Math.random() * 0.55 + 0.2, hue: 260 + Math.random() * 60,
    }));
    let t = 0, raf = 0;
    let lastPulseAt = 0;

    const loop = () => {
      t += 0.016;
      const s = getState();
      const level = getVoiceLevel();
      const active = s.enemies[0] ?? null;

      // Determine color from recent events
      let baseHue = s.listening ? 200 : 275;
      let react = s.speaking || level > 0.04 ? 0.5 + level * 1.2 : s.listening ? 0.3 : 0.12;
      const now = performance.now();
      const recent = s.events.filter((e) => now - e.at < 900);
      let eventHue = baseHue, flash = 0;
      for (const e of recent) {
        if (e.kind === "combat") { eventHue = 0; flash = Math.max(flash, 0.9); }
        else if (e.kind === "defeat") { eventHue = 45; flash = Math.max(flash, 1); }
        else if (e.kind === "heal") { eventHue = 140; flash = Math.max(flash, 0.7); }
        else if (e.kind === "treasure") { eventHue = 45; flash = Math.max(flash, 0.6); }
        else if (e.kind === "danger") { eventHue = 280; flash = Math.max(flash, 0.8); }
        else if (e.kind === "hit") { eventHue = 0; flash = Math.max(flash, 0.5); }
        else if (e.kind === "miss") { eventHue = 210; flash = Math.max(flash, 0.3); }
      }
      const hue = recent.length ? eventHue : baseHue;
      const pulse = react + flash * (1 - Math.min(1, (now - lastPulseAt) / 900));

      ctx.clearRect(0, 0, W, H);
      // outer glow
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 205 + pulse * 30);
      glow.addColorStop(0, `hsla(${hue},70%,55%,${0.35 * pulse})`);
      glow.addColorStop(0.5, `hsla(${hue},55%,40%,${0.18 * pulse})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // orb body
      const orb = ctx.createRadialGradient(cx - 18, cy - 18, 10, cx, cy, 150);
      orb.addColorStop(0, `hsla(${(hue + 20) % 360},40%,30%,0.95)`);
      orb.addColorStop(0.4, "rgba(30,18,55,0.92)");
      orb.addColorStop(1, "rgba(10,7,24,1)");
      ctx.beginPath(); ctx.arc(cx, cy, 150, 0, Math.PI * 2);
      ctx.fillStyle = orb; ctx.fill();

      // swirling particles
      for (const p of particles) {
        const dx = p.x - cx, dy = p.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const ang = Math.atan2(dy, dx) + 0.02 * pulse;
        const nd = Math.min(dist + 0.2, 130);
        p.x = cx + Math.cos(ang) * nd;
        p.y = cy + Math.sin(ang) * nd;
        const pa = 0.12 + 0.5 * Math.abs(Math.sin(t * 2 + p.x * 0.05)) * pulse;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (0.7 + pulse * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},65%,62%,${pa})`;
        ctx.fill();
      }

      // rotating rings
      ctx.beginPath(); ctx.arc(cx, cy, 146 + Math.sin(t * 8) * 3 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(43,75%,55%,${0.55 * pulse})`; ctx.lineWidth = 2 + pulse * 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 158 + Math.cos(t * 6) * 3 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue},60%,60%,${0.3 * pulse})`; ctx.lineWidth = 1 + pulse; ctx.stroke();

      // enemy composite (the threat frame inside the orb)
      if (active) {
        const bob = Math.sin(t * 2) * 4;
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, 100, 0, Math.PI * 2); ctx.clip();
        const art = enemyArtCache.get(active.art ?? "");
        if (art && active.art) {
          // Draw the creature art filling the 100px inner frame.
          // The art has a dark midnight bg; clip to the orb circle + darken edges
          // so it sits inside the orb like a magic window.
          ctx.globalAlpha = 0.96;
          ctx.drawImage(art, cx - 100, cy - 100, 200, 200);
          ctx.globalAlpha = 1;
          // soft inner vignette so it reads as inside the orb
          const vig = ctx.createRadialGradient(cx, cy, 20, cx, cy, 100);
          vig.addColorStop(0, "rgba(0,0,0,0)");
          vig.addColorStop(1, "rgba(6,4,16,0.55)");
          ctx.fillStyle = vig;
          ctx.fillRect(cx - 100, cy - 100, 200, 200);
        } else {
          ctx.font = "76px serif";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(active.emoji, cx, cy + bob + 8);
        }
        // enemy nameplate
        ctx.font = "bold 15px Georgia, serif";
        ctx.fillStyle = "rgba(242,234,216,0.92)";
        ctx.fillText(active.name, cx, cy + bob + 62);
        ctx.restore();
        // enemy hp pip
        const frac = Math.max(0, active.hp / active.maxHp);
        ctx.fillStyle = "rgba(212,74,94,0.7)";
        ctx.fillRect(cx - 50, cy + 84, 100, 6);
        ctx.fillStyle = frac > 0.5 ? "rgba(111,191,143,0.9)" : frac > 0.25 ? "rgba(212,168,67,0.9)" : "rgba(212,74,94,0.9)";
        ctx.fillRect(cx - 50, cy + 84, 100 * frac, 6);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function Hearts({ hp, maxHp }: { hp: number; maxHp: number }) {
  const n = Math.max(1, maxHp);
  const filled = Math.max(0, Math.min(n, Math.round(hp)));
  return (
    <span className="hearts" aria-label={`${hp} of ${maxHp} health`}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={`heart ${i < filled ? "filled" : "empty"}`}>♥</span>
      ))}
    </span>
  );
}

export function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [activeEnemy, setActiveEnemy] = useState<Enemy | null>(null);
  const [choices, setChoices] = useState<QuickChoice[]>([]);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [textInput, setTextInput] = useState("");
  const [orbEvents, setOrbEvents] = useState<{ kind: string; at: number; id: string }[]>([]);
  const [engineMode, setEngineMode] = useState<"frontier" | "fallback">("frontier");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recRef = useRef<any>(null);
  const sessionId = id ?? store.uid();
  const sceneRef = useRef<string>(HOLLOW_MINE.start);
  const campaignRef = useRef<Campaign | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const charsRef = useRef<Character[]>([]);

  const emitEvent = useCallback((kind: string, id = "orb") => {
    setOrbEvents((prev) => [...prev.slice(-8), { kind, at: performance.now(), id }]);
  }, []);

  useOrb(canvasRef, () => ({
    speaking, listening, enemies: activeEnemy ? [activeEnemy] : [], events: orbEvents,
  }));

  // Load session + its campaign + characters + saved state on mount
  useEffect(() => {
    if (!id) return;
    const session = store.getSession(id);
    const campaignId = session?.campaignId ?? id;
    const c = store.getCampaign(campaignId);
    if (!c) { navigate("/dashboard"); return; }
    const chars = c.characterIds.map((cid) => store.getCharacter(cid)).filter(Boolean) as Character[];
    const existing = store.getGameState(id);
    const gs = existing ?? newGameState(campaignId, chars);
    campaignRef.current = c;
    charsRef.current = chars;
    setCampaign(c);
    setCharacters(chars);
    setGameState(gs);
    stateRef.current = gs;
    setExchanges(store.getSession(id)?.exchanges ?? []);

    // If a scene node spawned an enemy, load it
    const firstEnemy = (Object.values(HOLLOW_MINE.nodes).find((n) => n.enemies.length))?.enemies[0];
    if (!gs.enemies.length && firstEnemy) {
      const e = ENEMY_LIBRARY[firstEnemy];
      if (e) {
        preloadEnemyArt(e.art);
        setActiveEnemy({ ...e, hp: e.maxHp, maxHp: e.maxHp });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // kick off a fresh DM intro when the session has no exchanges
  useEffect(() => {
    if (campaign && gameState && exchanges.length === 0 && !processing) {
      handlePlayerInput(`start`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign, gameState]);

  const persist = useCallback((gs: GameState, exs: Exchange[]) => {
    store.saveGameState(sessionId, gs);
    const existing = store.getSession(sessionId);
    store.saveSession({
      id: sessionId, campaignId: campaignRef.current?.id ?? sessionId,
      startedAt: existing?.startedAt ?? Date.now(), endedAt: null,
      summary: existing?.summary ?? "", exchanges: exs,
    });
  }, [sessionId]);

  const pushExchange = useCallback((role: "player" | "gm", content: string) => {
    setExchanges((prev) => {
      const next = [...prev, { role, content, ts: Date.now() }];
      if (stateRef.current) persist(stateRef.current, next);
      return next;
    });
  }, [persist]);

  const handleGMResponse = useCallback(async (input: string, resp: GMResponse) => {
    // speak narration
    if (ttsSupported()) {
      setSpeaking(true);
      speak(resp.narration, {
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    }
    pushExchange("gm", resp.narration);

    // apply effects via resolver
    if (resp.effects?.length && stateRef.current) {
      const result = applyEffects(stateRef.current, resp.effects);
      stateRef.current = result.state;
      setGameState(result.state);
      store.saveGameState(sessionId, result.state);
      for (const ev of result.events) emitEvent(ev.kind, ev.entityId);
      // update active enemy from resolved state
      if (result.state.enemies.length) {
        preloadEnemyArt(result.state.enemies[0].art);
        setActiveEnemy(result.state.enemies[0]);
      }
      if (result.rollResult) {
        pushExchange("gm", `🎲 ${result.rollResult.target} rolled a ${result.rollResult.total}.`);
      }
    }

    // set quick choices from GM (or sensible defaults)
    setChoices(resp.quickChoices?.length ? resp.quickChoices : defaultChoices());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emitEvent, pushExchange, sessionId]);

  function defaultChoices(): QuickChoice[] {
    return [
      { label: "Explore", prompt: "I explore what's around me.", icon: "🧭" },
      { label: "Talk", prompt: "I talk to whoever is here.", icon: "💬" },
      { label: "Use an item", prompt: "I use something from my pack.", icon: "🎒" },
    ];
  }

  const handlePlayerInput = useCallback(async (raw: string) => {
    if (!campaignRef.current || processing) return;
    const input = raw.trim();
    if (!input) return;
    setProcessing(true);
    if (input !== "start") pushExchange("player", input);

    const ctx = {
      campaign: campaignRef.current,
      characters: charsRef.current,
      recent: exchanges.slice(-6),
      activeEnemy,
    };

    try {
      // callGM internally falls back to the deterministic engine on any
      // frontier error or timeout, so it always resolves with a response.
      const resp = await callGM(ctx, input);
      setEngineMode(resp.fromFallback ? "fallback" : "frontier");
      await handleGMResponse(input, resp);
    } catch (e) {
      console.error("[session] GM loop failed:", e);
      // Surface a gentle error rather than freezing the session.
      pushExchange("gm", "The orb flickers and hums, trying to find the story again. Give it another moment and try again.");
    } finally {
      setProcessing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processing, exchanges, activeEnemy, handleGMResponse, pushExchange]);

  // Speech recognition
  useEffect(() => {
    if (!speechSupported()) { setMicSupported(false); return; }
    recRef.current = createRecognizer(
      (text) => { handlePlayerInput(text); },
      () => setListening(false),
      () => setListening(false),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleListening = useCallback(() => {
    if (recRef.current && !listening && !processing) {
      ensureAudioAnalysis().then(() => {
        try { recRef.current.start(); setListening(true); } catch { setListening(false); }
      });
    }
  }, [listening, processing]);

  const speakChoice = useCallback((c: QuickChoice) => {
    handlePlayerInput(c.prompt);
  }, [handlePlayerInput]);

  const handleEndSession = useCallback(async () => {
    cancelSpeech();
    await stopVoiceStream();
    const gs = stateRef.current;
    const beats = exchanges.filter((e) => e.role === "gm").map((e) => e.content).slice(-4);
    const summary = `**Session Recap: ${campaignRef.current?.name ?? "The Adventure"}**\n\n**Heroes:** ${charsRef.current.map((c) => `${c.name} (${c.speciesId} ${c.classId})`).join(", ") || "the new party"}.\n\n**What happened:** ${beats.join(" ") || "The party gathered around the orb and began their quest."}\n\n**Next hook:** ${campaignRef.current?.nextHook ?? "The orb glows with one last clue, hinting that the next chapter begins where this one ended."}`;
    const existing = store.getSession(sessionId);
    store.saveSession({
      id: sessionId, campaignId: campaignRef.current?.id ?? sessionId,
      startedAt: existing?.startedAt ?? Date.now(), endedAt: Date.now(),
      summary, exchanges,
    });
    if (campaignRef.current) {
      const updated = { ...campaignRef.current, sessionCount: (campaignRef.current.sessionCount ?? 0) + 1 };
      store.saveCampaign(updated);
    }
    navigate(`/session/${sessionId}/recap`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exchanges, navigate, sessionId]);

  const age = campaign?.ageTier ?? ("7-9" as AgeTierId);
  const tier = AGE_TIERS.find((a) => a.id === age) ?? AGE_TIERS[0];

  if (!campaign || !gameState) {
    return <div className="qm-loading qm-center">The orb is waking up...</div>;
  }

  return (
    <div className="session-page" data-age={tier.threat}>
      <header className="session-header">
        <div className="session-header-inner container">
          <button className="qm-btn qm-btn-ghost qm-btn-sm" onClick={() => navigate("/dashboard")}>← Quests</button>
          <div className="session-title">
            <h1>{campaign.name}</h1>
            <span className="session-tier">Age {tier.id}</span>
          </div>
          <div className="session-header-actions">
            {engineMode === "frontier"
              ? <span className="engine-badge" title="Game Master powered by a frontier model">✨ Live</span>
              : <span className="engine-badge fallback" title="Running on the built-in story engine">🕯️ Offline engine</span>}
            <button className="qm-btn qm-btn-gold qm-btn-sm" onClick={handleEndSession}>End Session</button>
          </div>
        </div>
      </header>

      <main className="session-main">
        <div className="orb-stage">
          <div className="orb-wrap">
            <canvas ref={canvasRef} className="palantir-orb" width={460} height={460} />
            <div className="orb-state">
              {speaking && <span className="state speaking">The Quest Master speaks</span>}
              {listening && <span className="state listening">Listening...</span>}
              {processing && <span className="state thinking">Weaving the tale...</span>}
              {!speaking && !listening && !processing && <span className="state idle">The orb awaits your voice</span>}
            </div>
          </div>

          <aside className="party-sidebar">
            <h3>The Party</h3>
            {characters.length === 0 && <p className="qm-muted qm-muted-text">No heroes yet. Create one first.</p>}
            {characters.map((c) => (
              <div className="party-member" key={c.id}>
                <div className="party-portrait" style={{ background: c.avatar.palette }}>
                  <span>{c.avatar.familiar}</span>
                </div>
                <div className="party-info">
                  <span className="party-name">{c.name}</span>
                  <span className="party-class">{c.speciesId} {c.classId}</span>
                  <Hearts hp={gameState.characters[c.id]?.hp ?? c.hp} maxHp={c.maxHp} />
                </div>
              </div>
            ))}
          </aside>
        </div>

        <div className="transcript">
          <h3>Adventure Log</h3>
          <div className="transcript-content">
            {exchanges.length === 0 && (
              <p className="empty-transcript">The Palantir awakens. Press the mic and speak your first words...</p>
            )}
            {exchanges.map((ex, i) => (
              <div key={i} className={`exchange ${ex.role}`}>
                <span className="exchange-role">{ex.role === "gm" ? "🔮 Quest Master" : "🎙️ You"}</span>
                <p className="exchange-text">{ex.content}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="session-controls">
          <button
            className={`mic-button ${listening ? "active" : ""}`}
            onClick={toggleListening}
            disabled={processing || speaking || listening || !micSupported}
            title="Press to speak"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" /><line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            {listening ? "Listening..." : "Press to Speak"}
          </button>
          <div className="text-input-row">
            <input
              className="qm-input"
              placeholder={micSupported ? "Or type your action..." : "Type your action..."}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && textInput.trim()) { handlePlayerInput(textInput); setTextInput(""); } }}
            />
            <button className="qm-btn qm-btn-gold" onClick={() => { if (textInput.trim()) { handlePlayerInput(textInput); setTextInput(""); } }}>Go</button>
          </div>
        </div>

        <div className="quick-choices">
          {choices.map((c) => (
            <button
              key={c.label}
              className="choice-button"
              onClick={() => speakChoice(c)}
              disabled={processing}
            >
              <span className="choice-icon">{c.icon}</span>
              <span className="choice-label">{c.label}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
