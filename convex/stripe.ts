import { httpAction } from "./_generated/server";
import { v } from "convex/values";

export const stripeWebhook = httpAction(async (_ctx, req: Request) => {
  console.log("Stripe webhook received");
  return new Response("OK", { status: 200 });
});

export const createCheckoutSession = httpAction(async (_ctx, req: Request) => {
  const body = await req.json();
  const { userId, planKey, successUrl, cancelUrl } = body;
  console.log("Creating checkout for:", userId, planKey);
  return new Response(JSON.stringify({ url: "https://stripe.com/checkout/mock" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});