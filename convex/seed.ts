import { mutation, query } from "./_generated/server";

const PLANS = [
  { planKey: "free", stripePriceId: "", sessionsPerMonth: 1, price: 0, targetAudience: "Acquisition" },
  { planKey: "young_adventurers", stripePriceId: "", sessionsPerMonth: 3, price: 1499, targetAudience: "Families, 6-12" },
  { planKey: "family_quest", stripePriceId: "", sessionsPerMonth: 6, price: 2799, targetAudience: "Multi-kid families" },
  { planKey: "adventurer", stripePriceId: "", sessionsPerMonth: 4, price: 5999, targetAudience: "Adults, new D&D" },
  { planKey: "veteran", stripePriceId: "", sessionsPerMonth: 12, price: 17999, targetAudience: "Adults, exp D&D" },
  { planKey: "b2b_camp", stripePriceId: "", sessionsPerMonth: 999, price: 39900, targetAudience: "Summer camps" },
  { planKey: "b2b_classroom", stripePriceId: "", sessionsPerMonth: 60, price: 17900, targetAudience: "After-school programs" },
  { planKey: "b2b_library", stripePriceId: "", sessionsPerMonth: 20, price: 9900, targetAudience: "Public libraries" },
];

export const seedPlans = mutation({
  handler: async (ctx) => {
    for (const plan of PLANS) {
      const existing = await ctx.db
        .query("plans")
        .withIndex("by_plan_key", (q) => q.eq("planKey", plan.planKey))
        .unique();
      if (!existing) {
        await ctx.db.insert("plans", plan);
      }
    }
    return "Plans seeded";
  },
});

export const getPlans = query({
  handler: async (ctx) => {
    return await ctx.db.query("plans").collect();
  },
});