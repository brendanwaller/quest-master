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
import { CrystalOrb } from "../components/CrystalOrb";
import {
  createRecognizer, speak, cancelSpeech, ensureAudioAnalysis,
  getVoiceLevel, speechSupported, ttsSupported, stopVoiceStream,
} from "../lib/voice";
import { useAuth } from "../hooks/useAuth";

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

  // No useOrb here — the CrystalOrb component drives its own animation loop,
  // reading the latest visual state via a ref passed down.
  const orbStateRef = useRef<{ speaking: boolean; listening: boolean; enemy: Enemy | null; events: { kind: string; at: number; id: string }[] }>({
    speaking, listening, enemy: activeEnemy, events: orbEvents,
  });
  orbStateRef.current = { speaking, listening, enemy: activeEnemy, events: orbEvents };

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

    // Restore active enemy from persisted game state if one exists
    if (gs.enemies.length) {
      setActiveEnemy(gs.enemies[0]);
    } else {
      // Otherwise, if a scene node spawned an enemy, load it
      const firstEnemy = (Object.values(HOLLOW_MINE.nodes).find((n) => n.enemies.length))?.enemies[0];
      if (firstEnemy) {
        const e = ENEMY_LIBRARY[firstEnemy];
        if (e) {
          setActiveEnemy({ ...e, hp: e.maxHp, maxHp: e.maxHp });
        }
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
        <div className="wizard-desk">
          <div className="desk-orb-zone">
            <div className="orb-wrap">
              <CrystalOrb canvasRef={canvasRef} getState={() => orbStateRef.current} />
              <div className="orb-state">
                {speaking && <span className="state speaking">The Quest Master speaks</span>}
                {listening && <span className="state listening">Listening...</span>}
                {processing && <span className="state thinking">Weaving the tale...</span>}
                {!speaking && !listening && !processing && <span className="state idle">The orb awaits your voice</span>}
              </div>
            </div>
          </div>

          <aside className="party-sidebar">
            <h3 className="party-title">The Party</h3>
            {characters.length === 0 && <p className="qm-muted qm-muted-text">No heroes yet. Create one first.</p>}
            {characters.map((c) => {
              const hp = gameState.characters[c.id]?.hp ?? c.hp;
              return (
                <div className="party-member" key={c.id}>
                  <div className="party-portrait" style={{ background: c.avatar.palette }}>
                    <span className="party-avatar">{c.avatar.familiar}</span>
                    <span className="party-emblem">{c.avatar.emblem}</span>
                  </div>
                  <div className="party-info">
                    <span className="party-name">{c.name}</span>
                    <span className="party-class">{c.speciesId} {c.classId}</span>
                    <Hearts hp={hp} maxHp={c.maxHp} />
                  </div>
                </div>
              );
            })}
          </aside>

          <div className="desk-dialogue">
            <div className="dialogue-box">
              <div className="dialogue-head">
                <span className="dialogue-gm">🔮 Quest Master</span>
                {speaking && <span className="dialogue-live"><i className="wave-bar"></i> speaking</span>}
              </div>
              <div className="dialogue-scroll">
                {exchanges.length === 0 && (
                  <p className="empty-transcript">The Palantir awakens. Press the mic and speak your first words...</p>
                )}
                {exchanges.map((ex, i) => (
                  <div key={i} className={`exchange ${ex.role}`}>
                    {ex.role === "player" && <span className="exchange-role">You said:</span>}
                    <p className="exchange-text">{ex.content}</p>
                  </div>
                ))}
              </div>
              <div className="dialogue-wave">
                <span className="wave-bar w1"></span><span className="wave-bar w2"></span>
                <span className="wave-bar w3"></span><span className="wave-bar w4"></span>
                <span className="wave-bar w5"></span><span className="wave-bar w6"></span>
              </div>
            </div>
          </div>

          <div className="desk-controls">
            <div className="session-controls">
              <button
                className={`mic-button ${listening ? "active" : ""}`}
                onClick={toggleListening}
                disabled={processing || speaking || listening || !micSupported}
                title="Press to speak"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" /><line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                {listening ? "Listening..." : "Speak"}
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
          </div>
        </div>
      </main>
    </div>
  );
}
