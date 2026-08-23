import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const createUser = mutation({
  args: { email: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (existing) return existing;
    return await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      planId: "free",
      sessionsUsedThisMonth: 0,
      createdAt: Date.now(),
    });
  },
});

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const updateUserPlan = mutation({
  args: {
    userId: v.id("users"),
    planId: v.union(
      v.literal("free"),
      v.literal("young_adventurers"),
      v.literal("family_quest"),
      v.literal("adventurer"),
      v.literal("veteran"),
      v.literal("b2b_camp"),
      v.literal("b2b_classroom"),
      v.literal("b2b_library")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { planId: args.planId });
  },
});

export const incrementSessionUsage = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (user) {
      await ctx.db.patch(args.userId, {
        sessionsUsedThisMonth: user.sessionsUsedThisMonth + 1,
      });
    }
  },
});

export const getPlan = query({
  args: { planKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("plans")
      .withIndex("by_plan_key", (q) => q.eq("planKey", args.planKey))
      .unique();
  },
});

export const getAllPlans = query({
  handler: async (ctx) => {
    return await ctx.db.query("plans").collect();
  },
});