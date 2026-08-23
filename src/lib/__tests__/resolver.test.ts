import { describe, it, expect } from "vitest";
import { newGameState, applyEffects, rollDice } from "../resolver";
import type { Character } from "../types";

function makeChar(overrides: Partial<Character> = {}): Character {
  return {
    id: "hero_1",
    name: "Maya",
    classId: "wizard",
    speciesId: "fairy",
    itemId: "locket",
    hp: 10,
    maxHp: 10,
    inventory: ["locket"],
    flags: [],
    avatar: { palette: "#d4a843", familiar: "🐱", emblem: "🌙", accessory: "🧣" },
    variant: 0,
    ...overrides,
  };
}

describe("resolver", () => {
  it("initializes a game state with characters and an active quest flag", () => {
    const gs = newGameState("campaign-1", [makeChar()]);
    expect(gs.characters["hero_1"]).toBeDefined();
    expect(gs.worldFlags.quest_active).toBe(true);
    expect(gs.enemies).toEqual([]);
  });

  it("applies damage to a character, clamped to 0", () => {
    let gs = newGameState("c", [makeChar({ hp: 5 })]);
    gs = applyEffects(gs, [
      { type: "damage", target: "hero_1", amount: 3, reason: "goblin attack" },
    ]).state;
    expect(gs.characters["hero_1"].hp).toBe(2);

    gs = applyEffects(gs, [
      { type: "damage", target: "hero_1", amount: 50, reason: "big hit" },
    ]).state;
    expect(gs.characters["hero_1"].hp).toBe(0);
  });

  it("heals a character, clamped to maxHp", () => {
    let gs = newGameState("c", [makeChar({ hp: 3 })]);
    gs = applyEffects(gs, [
      { type: "heal", target: "hero_1", amount: 20, reason: "rest" },
    ]).state;
    expect(gs.characters["hero_1"].hp).toBe(10);
  });

  it("grants and removes items", () => {
    let gs = newGameState("c", [makeChar()]);
    gs = applyEffects(gs, [
      { type: "grant_item", target: "hero_1", itemId: "glow_berry", reason: "found" },
    ]).state;
    expect(gs.characters["hero_1"].inventory).toContain("glow_berry");

    gs = applyEffects(gs, [
      { type: "remove_item", target: "hero_1", itemId: "glow_berry", reason: "ate it" },
    ]).state;
    expect(gs.characters["hero_1"].inventory).not.toContain("glow_berry");
  });

  it("sets only whitelisted flags and rejects unknown ones", () => {
    let gs = newGameState("c", [makeChar()]);
    gs = applyEffects(gs, [
      { type: "set_flag", target: "world", flag: "secret_found", reason: "found pouch" },
    ]).state;
    expect(gs.worldFlags.secret_found).toBe(true);

    gs = applyEffects(gs, [
      { type: "set_flag", target: "world", flag: "not_whitelisted", reason: "nope" },
    ]).state;
    expect(gs.worldFlags.not_whitelisted).toBeUndefined();
  });

  it("adjusts NPC trust: per-change clamped to +/-5, cumulative to +/-10", () => {
    let gs = newGameState("c", [makeChar()]);
    // A single change of +20 clamps to +5 (per-change cap)
    gs = applyEffects(gs, [
      { type: "adjust_npc", target: "goblin_1", amount: 20, reason: "shared snack" },
    ]).state;
    expect(gs.npcTrust["goblin_1"]).toBe(5);

    // Another +20 clamps to +5 again -> cumulative 10 (cumulative cap)
    gs = applyEffects(gs, [
      { type: "adjust_npc", target: "goblin_1", amount: 20, reason: "more snacks" },
    ]).state;
    expect(gs.npcTrust["goblin_1"]).toBe(10);

    // A -50 clamps to -5 per change -> 5
    gs = applyEffects(gs, [
      { type: "adjust_npc", target: "goblin_1", amount: -50, reason: "boo" },
    ]).state;
    expect(gs.npcTrust["goblin_1"]).toBe(5);
  });

  it("emits typed orb events for damage and heal", () => {
    const gs = newGameState("c", [makeChar()]);
    const dmg = applyEffects(gs, [
      { type: "damage", target: "hero_1", amount: 3, reason: "hit" },
    ]);
    expect(dmg.events[0].kind).toBe("combat");

    const heal = applyEffects(gs, [
      { type: "heal", target: "hero_1", amount: 3, reason: "rest" },
    ]);
    expect(heal.events[0].kind).toBe("heal");
  });

  it("rolls dice deterministically from a seed", () => {
    const r1 = rollDice(12345, "2d6+3");
    const r2 = rollDice(12345, "2d6+3");
    expect(r1.total).toBe(r2.total);
    expect(r1.rolls).toHaveLength(2);
    expect(r1.total).toBeGreaterThanOrEqual(5); // 2 + 3
    expect(r1.total).toBeLessThanOrEqual(15); // 12 + 3
  });

  it("rejects invalid dice notation", () => {
    expect(() => rollDice(1, "not dice")).toThrow();
  });
});
