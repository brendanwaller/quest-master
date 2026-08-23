import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createCharacter = mutation({
  args: {
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
    name: v.string(),
    class: v.string(),
    race: v.string(),
    starterItem: v.string(),
    avatarDescription: v.string(),
    avatarPrompt: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const classHp: Record<string, number> = {
      Fighter: 10,
      Wizard: 6,
      Rogue: 8,
      Cleric: 8,
      Ranger: 10,
      Bard: 8,
      Barbarian: 12,
      Monk: 8,
      Paladin: 10,
      Sorcerer: 6,
      Warlock: 8,
      Druid: 8,
    };
    const maxHp = classHp[args.class] || 8;
    return await ctx.db.insert("characters", {
      campaignId: args.campaignId,
      userId: args.userId,
      name: args.name,
      class: args.class,
      race: args.race,
      starterItem: args.starterItem,
      avatarDescription: args.avatarDescription,
      avatarPrompt: args.avatarPrompt,
      avatarUrl: args.avatarUrl,
      hp: maxHp,
      maxHp,
      createdAt: Date.now(),
    });
  },
});

export const getCharacters = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("characters")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
  },
});

export const updateCharacterHp = mutation({
  args: {
    characterId: v.id("characters"),
    hp: v.number(),
  },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");
    await ctx.db.patch(args.characterId, {
      hp: Math.max(0, Math.min(args.hp, character.maxHp)),
    });
  },
});