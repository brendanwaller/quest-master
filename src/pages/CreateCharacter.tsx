// ============================================================================
// Quest Master — Create Character: 5-step wizard + avatar reveal
// Steps: 1 Class, 2 Species, 3 Name, 4 Avatar, 5 Starter Item -> reveal
// ============================================================================

import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { store } from "../lib/store";
import { generateCharacterNames } from "../lib/nameGenerator";
import {
  AVATAR_ACCESSORIES,
  AVATAR_EMBLEMS,
  AVATAR_FAMILIARS,
  AVATAR_PALETTES,
  CLASSES,
  SPECIES,
  STARTER_ITEMS,
} from "../lib/types";
import type {
  AvatarPreset,
  Character,
  ClassDef,
  ItemDef,
  SpeciesDef,
} from "../lib/types";
import AvatarPortrait from "../components/AvatarPortrait";

const STEPS = ["Class", "Species", "Name", "Avatar", "Item"] as const;

export default function CreateCharacter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get("campaign");
  const [step, setStep] = useState(0);
  const [classId, setClassId] = useState<string | null>(null);
  const [speciesId, setSpeciesId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<AvatarPreset>({
    palette: AVATAR_PALETTES[0],
    familiar: AVATAR_FAMILIARS[0],
    emblem: AVATAR_EMBLEMS[0],
    accessory: AVATAR_ACCESSORIES[0],
  });
  const [itemId, setItemId] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [saved, setSaved] = useState<Character | null>(null);

  const cls: ClassDef | undefined = CLASSES.find((c) => c.id === classId);
  const species: SpeciesDef | undefined = SPECIES.find((s) => s.id === speciesId);

  const suggestedNames: string[] = useMemo(() => {
    if (!cls || !species) return [];
    return generateCharacterNames({
      race: species.name,
      characterClass: cls.name,
      tone: "heroic",
      count: 5,
    });
    // Regenerate per visit to the name step
  }, [cls, species, step]);

  const canContinue =
    (step === 0 && !!classId) ||
    (step === 1 && !!speciesId) ||
    (step === 2 && name.trim().length > 0) ||
    step === 3 ||
    (step === 4 && !!itemId);

  function finish() {
    if (!cls || !species || !itemId) return;
    const maxHp = 10 + cls.hitDie + species.toughness;
    const character: Character = {
      id: store.uid(),
      name: name.trim(),
      classId: cls.id,
      speciesId: species.id,
      itemId,
      hp: maxHp,
      maxHp,
      inventory: [itemId],
      flags: [],
      avatar,
      variant: 0,
    };
    store.saveCharacter(character);
    // Link the new hero to the campaign it was created for (if any)
    if (campaignId) {
      const camp = store.getCampaign(campaignId);
      if (camp) {
        store.saveCampaign({
          ...camp,
          characterIds: camp.characterIds.includes(character.id)
            ? camp.characterIds
            : [...camp.characterIds, character.id],
        });
      }
    }
    setSaved(character);
    setRevealing(true);
  }

  if (revealing && saved) {
    return (
      <div className="qm-page qm-reveal">
        <p className="qm-reveal-title">Your hero is ready!</p>
        <AvatarPortrait
          avatar={saved.avatar}
          size={220}
          glow
          className="qm-reveal-orb"
        />
        <h2 className="qm-reveal-name">{saved.name}</h2>
        <p className="qm-reveal-sub">
          {cls?.name} {species?.name} with a heart full of courage.
        </p>
        <button
          className="qm-btn-primary"
          onClick={() => navigate("/dashboard")}
        >
          Begin the Adventure
        </button>
      </div>
    );
  }

  return (
    <div className="qm-page">
      {/* Progress indicator */}
      <ol className="qm-progress" aria-label="Character creation progress">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={
              "qm-progress-step" +
              (i === step ? " is-active" : "") +
              (i < step ? " is-done" : "")
            }
          >
            {i < step ? "✓ " : `${i + 1}. `}
            {label}
          </li>
        ))}
      </ol>

      <div className="qm-wizard-body">
        {step === 0 && (
          <>
            <h1>Choose Your Class</h1>
            <div className="qm-grid">
              {CLASSES.map((c) => (
                <button
                  key={c.id}
                  className={"qm-card" + (classId === c.id ? " is-selected" : "")}
                  onClick={() => setClassId(c.id)}
                >
                  <span className="qm-card-icon">{c.icon}</span>
                  <span className="qm-card-name">{c.name}</span>
                  <span className="qm-card-desc">{c.powers}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1>Choose Your Species</h1>
            <div className="qm-grid">
              {SPECIES.map((s) => (
                <button
                  key={s.id}
                  className={"qm-card" + (speciesId === s.id ? " is-selected" : "")}
                  onClick={() => setSpeciesId(s.id)}
                >
                  <span className="qm-card-icon">{s.icon}</span>
                  <span className="qm-card-name">{s.name}</span>
                  <span className="qm-card-desc">{s.trait}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1>Name Your Hero</h1>
            <input
              className="qm-input"
              value={name}
              maxLength={24}
              placeholder="Type a heroic name..."
              onChange={(e) => setName(e.target.value)}
            />
            <p className="qm-hint">Or pick one of these:</p>
            <div className="qm-chip-row">
              {suggestedNames.map((n) => (
                <button
                  key={n}
                  className="qm-chip"
                  onClick={() => setName(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1>Design Your Avatar</h1>
            <AvatarPreview avatar={avatar} />
            <OptionRow
              label="Color"
              options={AVATAR_PALETTES}
              value={avatar.palette}
              onPick={(v) => setAvatar((a) => ({ ...a, palette: v as string }))}
            />
            <OptionRow
              label="Familiar"
              options={AVATAR_FAMILIARS}
              value={avatar.familiar}
              onPick={(v) => setAvatar((a) => ({ ...a, familiar: v }))}
            />
            <OptionRow
              label="Emblem"
              options={AVATAR_EMBLEMS}
              value={avatar.emblem}
              onPick={(v) => setAvatar((a) => ({ ...a, emblem: v }))}
            />
            <OptionRow
              label="Accessory"
              options={AVATAR_ACCESSORIES}
              value={avatar.accessory}
              onPick={(v) => setAvatar((a) => ({ ...a, accessory: v }))}
            />
          </>
        )}

        {step === 4 && (
          <>
            <h1>Pick a Starter Item</h1>
            <p className="qm-hint">Something to carry on every quest.</p>
            <div className="qm-grid qm-grid-narrow">
              {STARTER_ITEMS.map((item: ItemDef) => (
                <button
                  key={item.id}
                  className={"qm-card" + (itemId === item.id ? " is-selected" : "")}
                  onClick={() => setItemId(item.id)}
                >
                  <span className="qm-card-icon">{item.icon}</span>
                  <span className="qm-card-name">{item.name}</span>
                  <span className="qm-card-desc">{item.desc}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="qm-wizard-nav">
        <button
          className="qm-btn-secondary"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </button>
        {step < 4 ? (
          <button
            className="qm-btn-primary"
            disabled={!canContinue}
            onClick={() => setStep((s) => Math.min(4, s + 1))}
          >
            Continue
          </button>
        ) : (
          <button className="qm-btn-primary" disabled={!canContinue} onClick={finish}>
            Reveal My Hero!
          </button>
        )}
      </div>
    </div>
  );
}

// Small live avatar preview used inside the customization step.
function AvatarPreview({ avatar }: { avatar: AvatarPreset }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
      <AvatarPortrait avatar={avatar} size={160} glow />
    </div>
  );
}

function OptionRow({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="qm-option-row">
      <span className="qm-option-label">{label}</span>
      <div className="qm-chip-row">
        {options.map((opt) => (
          <button
            key={opt}
            aria-label={`${label} ${opt}`}
            className={
              "qm-swatch" + (value === opt ? " is-selected" : "")
            }
            style={isHex(opt) ? { background: opt } : undefined}
            onClick={() => onPick(opt)}
          >
            {!isHex(opt) && opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function isHex(v: string): boolean {
  return v.startsWith("#");
}
