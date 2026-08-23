import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const startSession = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", {
      campaignId: args.campaignId,
      startedAt: Date.now(),
    });
  },
});

export const endSession = mutation({
  args: { sessionId: v.id("sessions"), summary: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      endedAt: Date.now(),
      summary: args.summary,
    });
  },
});

export const getSessions = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .collect();
  },
});

export const getSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const addExchange = mutation({
  args: {
    sessionId: v.id("sessions"),
    role: v.union(v.literal("player"), v.literal("dm")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessionExchanges", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      timestamp: Date.now(),
    });
  },
});

export const getExchanges = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessionExchanges")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
  },
});