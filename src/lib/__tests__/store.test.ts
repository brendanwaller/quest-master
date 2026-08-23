import { describe, it, expect, beforeEach } from "vitest";
import { store } from "../../lib/store";
import type { Campaign, Character } from "../../lib/types";

// localStorage is not available in Node/jsdom by default; provide a minimal mock.
const ls = (() => {
  let m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
    clear: () => { m.clear(); },
  };
})();
(globalThis as any).localStorage = ls;

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "c1",
    name: "Ember's Hollow",
    setting: "The Hollow Mine",
    ageTier: "7-9",
    code: "ABC123",
    characterIds: [],
    sessionCount: 0,
    nextHook: "Glittering lights deep in the mine.",
    createdAt: 1234567,
    ...overrides,
  };
}

function makeChar(overrides: Partial<Character> = {}): Character {
  return {
    id: "h1",
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

describe("store", () => {
  beforeEach(() => ls.clear());

  it("persists and retrieves the current user", () => {
    expect(store.getCurrentUser()).toBeNull();
    store.setCurrentUser({ email: "a@b.c", name: "Alex" });
    expect(store.getCurrentUser()).toEqual({ email: "a@b.c", name: "Alex" });
    store.setCurrentUser(null);
    expect(store.getCurrentUser()).toBeNull();
  });

  it("persists consent and age tier", () => {
    expect(store.hasConsent()).toBe(false);
    store.setConsent(true);
    expect(store.hasConsent()).toBe(true);
    store.setAgeTier("7-9");
    expect(store.getAgeTier()).toBe("7-9");
  });

  it("saves and lists campaigns", () => {
    const c = makeCampaign();
    store.saveCampaign(c);
    const all = store.listCampaigns();
    expect(all).toHaveLength(1);
    expect(store.getCampaign("c1")?.name).toBe("Ember's Hollow");
  });

  it("updates a campaign in place (no duplicates)", () => {
    store.saveCampaign(makeCampaign());
    store.saveCampaign(makeCampaign({ sessionCount: 3 }));
    expect(store.listCampaigns()).toHaveLength(1);
    expect(store.getCampaign("c1")?.sessionCount).toBe(3);
  });

  it("saves characters and links them to campaigns", () => {
    const c = makeCampaign();
    store.saveCampaign(c);
    const hero = makeChar();
    store.saveCharacter(hero);

    // Simulate the wizard's campaign-linking step
    const camp = store.getCampaign("c1")!;
    store.saveCampaign({ ...camp, characterIds: [...camp.characterIds, hero.id] });

    expect(store.getCharacter("h1")?.name).toBe("Maya");
    expect(store.getCampaign("c1")?.characterIds).toContain("h1");
  });

  it("persists sessions and game states", () => {
    store.saveSession({
      id: "s1", campaignId: "c1", startedAt: 1, endedAt: null,
      summary: "", exchanges: [{ role: "gm", content: "Hello", ts: 1 }],
    });
    expect(store.getSession("s1")?.exchanges).toHaveLength(1);

    store.saveGameState("s1", {
      characters: {}, enemies: [], worldFlags: { quest_active: true },
      npcTrust: {}, seed: 5,
    });
    expect(store.getGameState("s1")?.worldFlags.quest_active).toBe(true);
  });
});
