import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function generateQuestCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const createCampaign = mutation({
  args: {
    name: v.string(),
    setting: v.string(),
    ownerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const questCode = generateQuestCode();
    const campaignId = await ctx.db.insert("campaigns", {
      ownerId: args.ownerId,
      name: args.name,
      setting: args.setting,
      questCode,
      createdAt: Date.now(),
    });
    await ctx.db.insert("campaignMembers", {
      campaignId,
      userId: args.ownerId,
      joinedAt: Date.now(),
    });
    return { campaignId, questCode };
  },
});

export const getCampaigns = query({
  args: { ownerId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("campaigns")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();
  },
});

export const getCampaignByQuestCode = query({
  args: { questCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("campaigns")
      .withIndex("by_quest_code", (q) => q.eq("questCode", args.questCode))
      .unique();
  },
});

export const joinCampaign = mutation({
  args: {
    questCode: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db
      .query("campaigns")
      .withIndex("by_quest_code", (q) => q.eq("questCode", args.questCode))
      .unique();
    if (!campaign) {
      throw new Error("Invalid quest code");
    }
    const existing = await ctx.db
      .query("campaignMembers")
      .withIndex("by_campaign_user", (q) =>
        q.eq("campaignId", campaign._id).eq("userId", args.userId)
      )
      .unique();
    if (!existing) {
      await ctx.db.insert("campaignMembers", {
        campaignId: campaign._id,
        userId: args.userId,
        joinedAt: Date.now(),
      });
    }
    return campaign;
  },
});

export const getCampaign = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.campaignId);
  },
});

export const getCampaignMembers = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("campaignMembers")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    const users = await Promise.all(
      members.map((m) => ctx.db.get(m.userId))
    );
    return members.map((m, i) => ({ ...m, user: users[i] }));
  },
});