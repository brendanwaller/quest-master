import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createNpc = mutation({
  args: {
    campaignId: v.id("campaigns"),
    name: v.string(),
    description: v.string(),
    relationship: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("npcs", {
      campaignId: args.campaignId,
      name: args.name,
      description: args.description,
      relationship: args.relationship,
    });
  },
});

export const getNpcs = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("npcs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
  },
});