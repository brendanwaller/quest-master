// ============================================================================
// Quest Master — Avatar Reveal: "the orb forms your hero" magic moment.
// A glowing orb pulses, then blooms into the hero's portrait and name.
// Accepts a character via route state or falls back to the newest saved one.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { store } from "../lib/store";
import { CLASSES, SPECIES } from "../lib/types";
import type { Character } from "../lib/types";
import AvatarPortrait from "../components/AvatarPortrait";

type RevealPhase = "orb" | "forming" | "revealed";

export default function AvatarReveal() {
  const navigate = useNavigate();
  const location = useLocation();

  // Route state first, else the most recently saved character.
  const character: Character | null = useMemo(() => {
    const state = location.state as { character?: Character } | null;
    if (state?.character) return state.character;
    const all = store.listCharacters();
    return all.length > 0 ? all[all.length - 1] : null;
  }, [location.state]);

  const [phase, setPhase] = useState<RevealPhase>("orb");

  useEffect(() => {
    if (!character) return;
    const t1 = setTimeout(() => setPhase("forming"), 1200);
    const t2 = setTimeout(() => setPhase("revealed"), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [character]);

  if (!character) {
    return (
      <div className="qm-page">
        <p>No hero found yet. Create one first!</p>
        <button className="qm-btn-primary" onClick={() => navigate("/create-character")}>
          Make a Hero
        </button>
      </div>
    );
  }

  const cls = CLASSES.find((c) => c.id === character.classId);
  const species = SPECIES.find((s) => s.id === character.speciesId);

  return (
    <div className="qm-page qm-reveal">
      {phase === "orb" && (
        <>
          <p className="qm-reveal-title">Watch closely...</p>
          <div className="qm-orb" aria-hidden="true">
            <div className="qm-orb-core" />
          </div>
          <p className="qm-reveal-sub">The orb is forming your hero.</p>
        </>
      )}

      {phase === "forming" && (
        <>
          <p className="qm-reveal-title">Magic is swirling!</p>
          <AvatarPortrait
            avatar={character.avatar}
            size={200}
            glow
            className="qm-reveal-forming"
          />
          <p className="qm-reveal-sub">Almost there...</p>
        </>
      )}

      {phase === "revealed" && (
        <>
          <p className="qm-reveal-title">Your hero is ready!</p>
          <AvatarPortrait avatar={character.avatar} size={220} glow className="qm-reveal-pop" />
          <h2 className="qm-reveal-name">{character.name}</h2>
          <p className="qm-reveal-sub">
            {cls ? `${cls.icon} ${cls.name}` : "Adventurer"}
            {species ? ` · ${species.icon} ${species.name}` : ""} · ❤️ {character.maxHp} hearts
          </p>
          <button className="qm-btn-primary" onClick={() => navigate("/dashboard")}>
            Begin the Adventure
          </button>
        </>
      )}
    </div>
  );
}
