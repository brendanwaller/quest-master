// ============================================================================
// Quest Master — The Game Master engine.
// Calls the frontier model (stealth/ox-alpha) via OpenRouter for narration +
// proposed effects; falls back to a rich deterministic engine if the network
// or AI is unavailable. The resolver validates all effects regardless.
// ============================================================================
import type { Character, Campaign, Exchange, Enemy } from "./types";
import type { EffectRequest } from "./resolver";
import { HOLLOW_MINE } from "./adventure";

export interface GMResponse {
  narration: string;
  effects: EffectRequest[];
  quickChoices: { label: string; prompt: string; icon: string }[];
  fromFallback: boolean;
}

interface GMContext {
  campaign: Campaign;
  characters: Character[];
  recent: Exchange[];
  activeEnemy: Enemy | null;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "stealth/ox-alpha";

const SYSTEM_PROMPT = `You are the Quest Master, a warm, encouraging AI Game Master for young adventurers (ages 7-13). You guide collaborative, voice-first fantasy adventures inside a magical crystal orb.

PRINCIPLES:
- Warm, encouraging, playful. Never graphic violence or scary content.
- Simple, child-friendly language. Celebrate creative problem-solving over combat.
- Failures are learning moments, never punishments.
- End each response with a clear choice or question.
- Narrate in second person ("You see...", "The goblin grins..."). 3-5 short paragraphs.
- Include sensory details (sounds, smells, light, texture).

EFFECT TYPES you may emit (as a JSON array in the "effects" field):
- damage: {type, target, amount, reason}
- heal: {type, target, amount, reason}
- grant_item: {type, target, itemId, reason}
- remove_item: {type, target, itemId, reason}
- set_flag: {type, flag, reason}  (flags: quest_active, quest_complete, boss_alert, secret_found, ally_recruited, item_identified, trap_disarmed, hollow_mine_cleared)
- adjust_npc: {type, target, amount, reason}
- roll_dice: {type, target, itemId, reason}  (itemId is the dice notation like "1d20+2")

RESPOND WITH STRICT JSON ONLY, no markdown fences, exactly this shape:
{"narration":"<your narration>","effects":[<effect objects>],"quickChoices":[{"label":"<short label>","prompt":"<full sentence to speak>","icon":"<one emoji>"}]}`;

function buildUserPrompt(ctx: GMContext, playerInput: string): string {
  const party = ctx.characters
    .map((c) => `${c.name} (${c.speciesId} ${c.classId}, HP ${c.hp}/${c.maxHp}, inventory: ${c.inventory.join(", ") || "empty"})`)
    .join("\n");
  const recent = ctx.recent.slice(-6).map((e) => `${e.role === "player" ? "Player" : "GM"}: ${e.content}`).join("\n");
  const enemy = ctx.activeEnemy
    ? `\nActive enemy in the scene: ${ctx.activeEnemy.name} (HP ${ctx.activeEnemy.hp}/${ctx.activeEnemy.maxHp}). Description: ${ctx.activeEnemy.desc}`
    : "";
  return `Campaign: ${ctx.campaign.name} (${ctx.campaign.setting})\nAge tier: ${ctx.campaign.ageTier}\nParty:\n${party}\nRecent story:\n${recent}\n${enemy}\n\nThe player just said: "${playerInput}"\n\nRespond as the Quest Master.`;
}

export async function callGM(ctx: GMContext, playerInput: string): Promise<GMResponse> {
  // If no API key is configured, don't waste the frontier timeout (up to 60s)
  // before falling back. Go straight to the deterministic engine.
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || "";
  if (!apiKey) {
    const fb = fallbackGM(ctx, playerInput);
    return { ...fb, fromFallback: true };
  }

  // Try the frontier model first, with a bounded timeout so a slow/hung call
  // falls back to the deterministic engine promptly (never bricks the session).
  // Ox Alpha is a reasoning model with ~22 tok/s throughput; a full narration
  // can take 15-45s. 60s is a healthy ceiling that lets real frontier output
  // finish while still recovering from a genuinely hung call. The session's
  // finally-block guarantees setProcessing(false) regardless, so no freeze.
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000); // 60s cap

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Title": "Quest Master",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(ctx, playerInput) },
        ],
        temperature: 0.9,
        max_tokens: 900,
        response_format: { type: "json_object" },
      }),
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("empty completion");

    const parsed = JSON.parse(stripFences(content)) as {
      narration?: string;
      effects?: EffectRequest[];
      quickChoices?: { label: string; prompt: string; icon: string }[];
    };

    if (!parsed.narration) throw new Error("no narration");

    return {
      narration: parsed.narration,
      effects: (parsed.effects ?? []).slice(0, 6),
      quickChoices: (parsed.quickChoices ?? []).slice(0, 3),
      fromFallback: false,
    };
  } catch (e) {
    console.warn("[gm] frontier unavailable, falling back to engine:", e);
    const fb = fallbackGM(ctx, playerInput);
    return { ...fb, fromFallback: true };
  }
}

function stripFences(s: string): string {
  return s.replace(/```json/gi, "").replace(/```/g, "").trim();
}

// ---- Deterministic fallback engine (Hollow Mine adventure) -----------------
function fallbackGM(ctx: GMContext, playerInput: string): Omit<GMResponse, "fromFallback"> {
  const lower = playerInput.toLowerCase();
  const hero = ctx.characters[0];
  const name = hero?.name || "Hero";
  const enemy = ctx.activeEnemy;

  // Attack intent -> combat
  if (/(attack|hit|strike|fight|shoot|slash|stab|spell|fire|punch|swing|smash)/.test(lower)) {
    if (enemy) {
      const dmg = 2 + Math.floor(Math.abs(ctx.recent.length) % 3);
      return {
        narration: `You lunge forward and ${name} strikes the ${enemy.name}! The orb flares crimson as your attack lands. The ${enemy.name} ${enemy.hp - dmg <= 0 ? "wobbles, lets out a surprised little pop, and fades into glittering motes. Victory! The orb shimmers gold." : "shakes it off with a growl, but you can see it's hurting."} What do you do next?`,
        effects: enemy.hp - dmg <= 0
          ? [
              { type: "damage", target: enemy.id, amount: dmg, reason: `${name} attacks` },
              { type: "set_flag", target: "world", flag: "hollow_mine_cleared", reason: "enemy defeated" },
            ]
          : [{ type: "damage", target: enemy.id, amount: dmg, reason: `${name} attacks` }],
        quickChoices: [
          { label: "Attack again", prompt: "I keep attacking!", icon: "⚔️" },
          { label: "Use an item", prompt: "I use something from my pack.", icon: "🎒" },
          { label: "Talk it out", prompt: "I try to talk to the enemy.", icon: "💬" },
        ],
      };
    }
    return {
      narration: `You ready your stance, ready to fight! But there's no enemy in sight right now. The orb hums patiently, waiting. Perhaps a foe will reveal itself further in. What would you like to do?`,
      effects: [],
      quickChoices: [
        { label: "Keep exploring", prompt: "I explore ahead.", icon: "🧭" },
        { label: "Look around", prompt: "I look carefully around me.", icon: "👀" },
        { label: "Call for a friend", prompt: "I call out to see who's here.", icon: "📣" },
      ],
    };
  }

  // Item / search intent
  if (/(search|loot|look|explore|open|take|find|check|inspect)/.test(lower)) {
    return {
      narration: `You peer into the gloom of the Hollow Mine. Beneath a fallen pickaxe you spot a tiny leather pouch! Inside glimmers a silver key that hums with faint magic. This might open something important. Where will you go next?`,
      effects: [
        { type: "grant_item", target: hero?.id ?? "hero", itemId: "silver_key", reason: "found in the Hollow Mine" },
        { type: "set_flag", target: "world", flag: "secret_found", reason: "found hidden pouch" },
      ],
      quickChoices: [
        { label: "Follow the hum", prompt: "I follow the humming sound.", icon: "🔑" },
        { label: "Look further", prompt: "I keep searching the mine.", icon: "🔍" },
        { label: "Rest a moment", prompt: "I take a short rest.", icon: "🛌" },
      ],
    };
  }

  // Heal/rest intent
  if (/(heal|rest|sleep|potion|drink|bandage|camp|hide)/.test(lower)) {
    const amt = 3;
    return {
      narration: `You find a soft nook of moss and settle in to catch your breath. Warm golden light washes over ${name}, knitting small scrapes and restoring strength. You feel ready for whatever lies deeper in the mine.`,
      effects: [{ type: "heal", target: hero?.id ?? "hero", amount: amt, reason: "took a rest" }],
      quickChoices: [
        { label: "Press on", prompt: "I'm ready, let's go deeper.", icon: "🚶" },
        { label: "Examine the wall", prompt: "I examine the cave wall.", icon: "🧱" },
        { label: "Listen", prompt: "I listen carefully.", icon: "👂" },
      ],
    };
  }

  // Greeting / default
  const openings = [
    `The Hollow Mine stretches before you, its walls glittering with scattered quartz. A cool draft whispers past, carrying the faint sound of dripping water and, somewhere deeper, a gentle rumbling snore. ${name} takes a brave step forward. The orb pulses warmly, encouraging. What does the party do?`,
    `Dust motes dance in a shaft of pale light from a crack far above. A friendly glow-worm blinks at ${name}, then points its tiny light toward a dark tunnel on the left. To the right, a strange purple crystal pulses like a heartbeat. Which way feels right?`,
    `The mine opens into a cavern where old mining carts sit rusted and forgotten. In the center, a smooth stone table holds a single, unlit candle and a note in neat handwriting: "For the brave-hearted, the deep answer waits below." The candle suddenly lights itself!`,
  ];
  return {
    narration: openings[Math.abs(ctx.recent.length) % openings.length],
    effects: [],
    quickChoices: [
      { label: "Go left", prompt: "We go through the left tunnel.", icon: "⬅️" },
      { label: "Go right", prompt: "We head toward the purple crystal.", icon: "➡️" },
      { label: "Inspect the table", prompt: "We examine the stone table.", icon: "🔍" },
    ],
  };
}
