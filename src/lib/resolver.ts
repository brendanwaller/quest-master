// ============================================================================
// Quest Master — Deterministic Game-State Resolver (client-side).
// The GM proposes effects; the resolver validates + applies them + emits events.
// Never trusts the LLM for state. All bounds enforced here. Mirrors convex/resolver.
// ============================================================================
import type { GameState, Character, Enemy } from "./types";

export type EffectType =
  | "damage" | "heal" | "grant_item" | "remove_item"
  | "set_flag" | "adjust_npc" | "roll_dice";

export interface EffectRequest {
  type: EffectType;
  target: string;         // character id, enemy id, or flag/npc key
  amount?: number;
  itemId?: string;
  flag?: string;
  reason: string;
}

export interface OrbEvent {
  kind: "combat" | "heal" | "treasure" | "danger" | "flag" | "npc_change" | "hit" | "miss" | "defeat";
  entityId: string;
  intensity: "low" | "medium" | "high";
}

const FLAG_WHITELIST = new Set([
  "quest_active", "quest_complete", "boss_alert", "secret_found",
  "ally_recruited", "item_identified", "trap_disarmed", "hollow_mine_cleared",
]);

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// xorshift for determinism
function nextRandom(seed: number) {
  let x = seed >>> 0;
  x ^= x << 13; x >>>= 0;
  x ^= x >> 17;
  x ^= x << 5; x >>>= 0;
  return { value: x, nextSeed: x };
}

export function rollDice(seed: number, notation: string): { total: number; rolls: number[]; nextSeed: number } {
  const m = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!m) throw new Error(`Bad dice: ${notation}`);
  const count = Math.min(parseInt(m[1], 10), 20);
  const sides = Math.min(parseInt(m[2], 10), 100);
  const mod = m[3] ? parseInt(m[3], 10) : 0;
  const rolls: number[] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    const r = nextRandom(s);
    rolls.push((r.value % sides) + 1);
    s = r.nextSeed;
  }
  return { total: rolls.reduce((a, b) => a + b, 0) + mod, rolls, nextSeed: s };
}

export function newGameState(campaignId: string, chars: Character[]): GameState {
  return {
    characters: Object.fromEntries(chars.map((c) => [c.id, { ...c }])),
    enemies: [],
    worldFlags: { quest_active: true },
    npcTrust: {},
    seed: Date.now() >>> 0,
  };
}

export interface ApplyResult {
  state: GameState;
  events: OrbEvent[];
  rollResult?: { target: string; total: number; rolls: number[] };
}

export function applyEffects(state: GameState, requests: EffectRequest[]): ApplyResult {
  const s: GameState = JSON.parse(JSON.stringify(state));
  const events: OrbEvent[] = [];
  let seed = s.seed;
  let rollResult: ApplyResult["rollResult"];

  const findChar = (id: string): Character | undefined => s.characters[id];
  const findEnemy = (id: string): Enemy | undefined => s.enemies.find((e) => e.id === id);
  const findTarget = (id: string): Character | Enemy | undefined => findChar(id) ?? findEnemy(id);

  for (const req of requests) {
    try {
      switch (req.type) {
        case "damage": {
          const t = findTarget(req.target);
          if (!t) throw new Error(`No target ${req.target}`);
          const amt = Math.max(1, clamp(req.amount ?? 1, 1, t.maxHp));
          t.hp = clamp(t.hp - amt, 0, t.maxHp);
          const defeated = t.hp <= 0;
          events.push({
            kind: defeated ? "defeat" : "combat",
            entityId: req.target,
            intensity: amt > t.maxHp / 2 ? "high" : "medium",
          });
          break;
        }
        case "heal": {
          const t = findTarget(req.target);
          if (!t) throw new Error(`No target ${req.target}`);
          const amt = Math.max(1, clamp(req.amount ?? 1, 1, t.maxHp));
          t.hp = clamp(t.hp + amt, 0, t.maxHp);
          events.push({ kind: "heal", entityId: req.target, intensity: amt > t.maxHp / 2 ? "high" : "medium" });
          break;
        }
        case "grant_item": {
          const c = findChar(req.target);
          if (!c) throw new Error(`No char ${req.target}`);
          if (req.itemId && c.inventory.length < 20 && !c.inventory.includes(req.itemId)) c.inventory.push(req.itemId);
          events.push({ kind: "treasure", entityId: req.target, intensity: "medium" });
          break;
        }
        case "remove_item": {
          const c = findChar(req.target);
          if (c && req.itemId) {
            const i = c.inventory.indexOf(req.itemId);
            if (i >= 0) c.inventory.splice(i, 1);
          }
          break;
        }
        case "set_flag": {
          if (!req.flag || !FLAG_WHITELIST.has(req.flag)) throw new Error(`Bad flag ${req.flag}`);
          s.worldFlags[req.flag] = true;
          events.push({ kind: "flag", entityId: req.flag, intensity: "low" });
          break;
        }
        case "adjust_npc": {
          const amt = clamp(req.amount ?? 1, -5, 5);
          s.npcTrust[req.target] = clamp((s.npcTrust[req.target] ?? 0) + amt, -10, 10);
          events.push({ kind: "npc_change", entityId: req.target, intensity: Math.abs(amt) > 2 ? "high" : "medium" });
          break;
        }
        case "roll_dice": {
          if (!req.itemId) throw new Error("roll_dice needs itemId=notation");
          const r = rollDice(seed, req.itemId);
          seed = r.nextSeed;
          rollResult = { target: req.target, total: r.total, rolls: r.rolls };
          events.push({ kind: "flag", entityId: req.target, intensity: "low" });
          break;
        }
      }
    } catch (e) {
      console.warn("[resolver] rejected effect:", req, e);
    }
  }

  s.seed = seed;
  return { state: s, events, rollResult };
}
