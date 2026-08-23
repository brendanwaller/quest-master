import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
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
    sessionsUsedThisMonth: v.number(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  campaigns: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    setting: v.string(),
    questCode: v.string(),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_quest_code", ["questCode"]),

  campaignMembers: defineTable({
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
    joinedAt: v.number(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_user", ["userId"])
    .index("by_campaign_user", ["campaignId", "userId"]),

  characters: defineTable({
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
    name: v.string(),
    class: v.string(),
    race: v.string(),
    starterItem: v.string(),
    avatarDescription: v.string(),
    avatarPrompt: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    hp: v.number(),
    maxHp: v.number(),
    createdAt: v.number(),
  }).index("by_campaign", ["campaignId"]),

  sessions: defineTable({
    campaignId: v.id("campaigns"),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    summary: v.optional(v.string()),
    // Phase B: persistent game state for resolver
    gameState: v.optional(v.any()),
  }).index("by_campaign", ["campaignId"]),

  gameStates: defineTable({
    sessionId: v.id("sessions"),
    // Phase B resolver state (structured for queries)
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
    world: v.object({
      flags: v.record(v.string(), v.boolean()),
      npcTrust: v.record(v.string(), v.number()),
    }),
    rngSeed: v.number(),
    updatedAt: v.number(),
  }).index("by_session", ["sessionId"]),

  sessionExchanges: defineTable({
    sessionId: v.id("sessions"),
    role: v.union(v.literal("player"), v.literal("dm")),
    content: v.string(),
    timestamp: v.number(),
  }).index("by_session", ["sessionId"]),

  npcs: defineTable({
    campaignId: v.id("campaigns"),
    name: v.string(),
    description: v.string(),
    relationship: v.string(),
  }).index("by_campaign", ["campaignId"]),

  userProfiles: defineTable({
    userId: v.id("users"),
    avatarUrl: v.optional(v.string()),
    preferences: v.optional(v.any()),
  }).index("by_user", ["userId"]),

  plans: defineTable({
    planKey: v.string(),
    stripePriceId: v.optional(v.string()),
    sessionsPerMonth: v.number(),
    price: v.number(),
    targetAudience: v.string(),
  }).index("by_plan_key", ["planKey"]),

  subscriptions: defineTable({
    userId: v.id("users"),
    planId: v.id("plans"),
    stripeSubscriptionId: v.optional(v.string()),
    status: v.string(),
    currentPeriodEnd: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  seats: defineTable({
    subscriptionId: v.id("subscriptions"),
    userId: v.optional(v.id("users")),
    claimedAt: v.optional(v.number()),
  }).index("by_subscription", ["subscriptionId"]),
});