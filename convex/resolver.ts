import { mutation, action } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// Phase B: Deterministic Game-State Resolver
// ============================================================================
// The LLM proposes EffectRequests; the resolver validates, applies, emits Orb events.
// Never trusts LLM output for state. All bounds enforced here.

// -----------------------------------------------------------------------------
// Types (mirrored from resolver design)
// -----------------------------------------------------------------------------

export type EffectType =
  | "damage"
  | "heal"
  | "grant_item"
  | "remove_item"
  | "set_flag"
  | "adjust_npc"
  | "roll_dice";

export interface EffectRequest {
  type: EffectType;
  target: string;           // entity id (character/monster/npc/world flag)
  amount?: number;          // bounded by schema
  itemId?: string;
  flag?: string;            // whitelisted
  reason: string;           // for narration + logs
}

export interface OrbEvent {
  kind: "combat" | "heal" | "treasure" | "danger" | "flag" | "npc_change";
  entityId: string;
  intensity: "low" | "medium" | "high";
  timestamp: number;
}

export interface ResolverState {
  characters: Array<{
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    inventory: string[];
    flags: string[];
  }>;
  monsters: Array<{
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    challenge: number;
    status: string;
  }>;
  world: {
    flags: Record<string, boolean>;
    npcTrust: Record<string, number>;
  };
  rngSeed: number;
  updatedAt: number;
}

const FLAG_WHITELIST = new Set([
  "quest_active", "quest_complete", "boss_alert", "secret_found",
  "ally_recruited", "item_identified", "trap_disarmed",
]);

// -----------------------------------------------------------------------------
// RNG (server-seeded, never from LLM)
// -----------------------------------------------------------------------------

function nextRandom(seed: number): { value: number; nextSeed: number } {
  // Simple xorshift for determinism
  let x = seed;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  return { value: x >>> 0, nextSeed: x };
}

function rollDice(seed: number, notation: string): { total: number; rolls: number[]; nextSeed: number } {
  // Parse "NdS+M" or "NdS-M" (e.g. "2d6+3")
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) throw new Error(`Invalid dice notation: ${notation}`);
  const [, countStr, sidesStr, modStr] = match;
  const count = Math.min(parseInt(countStr, 10), 20);
  const sides = Math.min(parseInt(sidesStr, 10), 100);
  const mod = modStr ? parseInt(modStr, 10) : 0;

  const rolls: number[] = [];
  let currentSeed = seed;
  for (let i = 0; i < count; i++) {
    const r = nextRandom(currentSeed);
    rolls.push((r.value % sides) + 1);
    currentSeed = r.nextSeed;
  }
  const total = rolls.reduce((a, b) => a + b, 0) + mod;
  return { total, rolls, nextSeed: currentSeed };
}

// -----------------------------------------------------------------------------
// Effect application (pure, testable)
// -----------------------------------------------------------------------------

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function applyEffect(state: ResolverState, req: EffectRequest, rngSeed: number): {
  state: ResolverState;
  orbEvent: OrbEvent | null;
  nextRngSeed: number;
} {
  let newState = JSON.parse(JSON.stringify(state)) as ResolverState;
  let currentSeed = rngSeed;
  let orbEvent: OrbEvent | null = null;

  // Helper: find character/monster
  const findChar = (id: string) => newState.characters.find(c => c.id === id);
  const findMon = (id: string) => newState.monsters.find(m => m.id === id);

  switch (req.type) {
    case "damage": {
      const target = findChar(req.target) || findMon(req.target);
      if (!target) throw new Error(`Target not found: ${req.target}`);
      const amt = Math.max(1, clamp(req.amount ?? 1, 1, target.maxHp));
      target.hp = clamp(target.hp - amt, 0, target.maxHp);
      orbEvent = {
        kind: "combat",
        entityId: req.target,
        intensity: amt > target.maxHp / 2 ? "high" : "medium",
        timestamp: Date.now(),
      };
      break;
    }

    case "heal": {
      const target = findChar(req.target) || findMon(req.target);
      if (!target) throw new Error(`Target not found: ${req.target}`);
      const amt = Math.max(1, clamp(req.amount ?? 1, 1, target.maxHp));
      target.hp = clamp(target.hp + amt, 0, target.maxHp);
      orbEvent = {
        kind: "heal",
        entityId: req.target,
        intensity: amt > target.maxHp / 2 ? "high" : "medium",
        timestamp: Date.now(),
      };
      break;
    }

    case "grant_item": {
      const target = findChar(req.target);
      if (!target) throw new Error(`Character not found: ${req.target}`);
      if (!req.itemId) throw new Error("grant_item requires itemId");
      if (target.inventory.length >= 20) throw new Error("Inventory full");
      target.inventory.push(req.itemId);
      orbEvent = {
        kind: "treasure",
        entityId: req.target,
        intensity: "medium",
        timestamp: Date.now(),
      };
      break;
    }

    case "remove_item": {
      const target = findChar(req.target);
      if (!target) throw new Error(`Character not found: ${req.target}`);
      if (!req.itemId) throw new Error("remove_item requires itemId");
      const idx = target.inventory.indexOf(req.itemId);
      if (idx >= 0) target.inventory.splice(idx, 1);
      break;
    }

    case "set_flag": {
      if (!req.flag || !FLAG_WHITELIST.has(req.flag)) {
        throw new Error(`Invalid or unwhitelisted flag: ${req.flag}`);
      }
      newState.world.flags[req.flag] = true;
      orbEvent = {
        kind: "flag",
        entityId: req.flag,
        intensity: "low",
        timestamp: Date.now(),
      };
      break;
    }

    case "adjust_npc": {
      const amt = clamp(req.amount ?? 1, -5, 5);
      newState.world.npcTrust[req.target] =
        clamp((newState.world.npcTrust[req.target] ?? 0) + amt, -10, 10);
      orbEvent = {
        kind: "npc_change",
        entityId: req.target,
        intensity: Math.abs(amt) > 2 ? "high" : "medium",
        timestamp: Date.now(),
      };
      break;
    }

    case "roll_dice": {
      if (!req.itemId) throw new Error("roll_dice requires dice notation in itemId");
      const r = rollDice(currentSeed, req.itemId);
      currentSeed = r.nextSeed;
      // Store roll result in a temp flag for narration
      newState.world.flags[`last_roll_${req.target}`] = true;
      newState.world.npcTrust[`last_roll_total_${req.target}`] = r.total;
      break;
    }

    default:
      throw new Error(`Unknown effect type: ${(req as EffectRequest).type}`);
  }

  newState.updatedAt = Date.now();
  newState.rngSeed = currentSeed;

  return { state: newState, orbEvent, nextRngSeed: currentSeed };
}

// -----------------------------------------------------------------------------
// Public: apply a batch of effects atomically
// -----------------------------------------------------------------------------

export const applyEffects = mutation({
  args: {
    sessionId: v.id("sessions"),
    requests: v.array(v.object({
      type: v.string(),
      target: v.string(),
      amount: v.optional(v.number()),
      itemId: v.optional(v.string()),
      flag: v.optional(v.string()),
      reason: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const { sessionId, requests } = args;

    // Load current state
    const gs = await ctx.db.query("gameStates")
      .withIndex("by_session", q => q.eq("sessionId", sessionId))
      .unique();
    if (!gs) throw new Error("GameState not found");

    let state: ResolverState = {
      characters: gs.characters,
      monsters: gs.monsters,
      world: gs.world,
      rngSeed: gs.rngSeed,
      updatedAt: gs.updatedAt,
    };

    const orbEvents: OrbEvent[] = [];

    for (const req of requests) {
      try {
        const result = applyEffect(state, req as EffectRequest, state.rngSeed);
        state = result.state;
        if (result.orbEvent) orbEvents.push(result.orbEvent);
      } catch (e) {
        // Log rejected effect but continue others
        console.warn("Effect rejected:", e instanceof Error ? e.message : e);
      }
    }

    // Persist
    await ctx.db.patch(gs._id, {
      characters: state.characters,
      monsters: state.monsters,
      world: state.world,
      rngSeed: state.rngSeed,
      updatedAt: state.updatedAt,
    });

    return { orbEvents, state };
  },
});

// -----------------------------------------------------------------------------
// Initialization helper
// -----------------------------------------------------------------------------

export const initializeGameState = mutation({
  args: {
    sessionId: v.id("sessions"),
    characters: v.array(v.object({
      id: v.string(),
      name: v.string(),
      hp: v.number(),
      maxHp: v.number(),
      inventory: v.array(v.string()),
      flags: v.array(v.string()),
    })),
    monsters: v.array(v.object({
      id: v.string(),
      name: v.string(),
      hp: v.number(),
      maxHp: v.number(),
      challenge: v.number(),
      status: v.string(),
    })),
    rngSeed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const seed = args.rngSeed ?? Date.now() ^ Math.floor(Math.random() * 1_000_000);
    await ctx.db.insert("gameStates", {
      sessionId: args.sessionId,
      characters: args.characters,
      monsters: args.monsters,
      world: { flags: {}, npcTrust: {} },
      rngSeed: seed,
      updatedAt: Date.now(),
    });
    return { seed };
  },
});

// -----------------------------------------------------------------------------
// Query for current state (used by AI for context)
// -----------------------------------------------------------------------------

export const getGameState = action({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const gs = await ctx.db.query("gameStates")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .unique();
    return gs ?? null;
  },
});