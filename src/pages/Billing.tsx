import { useAuth } from "../hooks/useAuth";
import { useState } from "react";
import { store } from "../lib/store";

const PLAN_DETAILS: Record<string, { 
  name: string; 
  price: number; 
  sessions: number; 
  features: string[];
  tier: "kid" | "adult" | "b2b";
}> = {
  free: { name: "Free", price: 0, sessions: 1, features: ["1 session/month", "Browser TTS", "Basic orb", "Quest Codes"], tier: "kid" },
  young_adventurers: { name: "Young Adventurers", price: 1499, sessions: 3, features: ["3 sessions/month", "Browser TTS", "Animated orb", "Quest Codes", "Character avatars"], tier: "kid" },
  family_quest: { name: "Family Quest", price: 2799, sessions: 6, features: ["6 sessions/month", "Browser TTS", "Animated orb", "Quest Codes", "Character avatars", "Multiple kids"], tier: "kid" },
  adventurer: { name: "Adventurer", price: 5999, sessions: 4, features: ["4 sessions/month", "ElevenLabs voice (Phase 2)", "Premium orb", "Longer sessions", "Session replay (Phase 2)"], tier: "adult" },
  veteran: { name: "Veteran", price: 17999, sessions: 12, features: ["12 sessions/month", "ElevenLabs voice (Phase 2)", "Premium orb", "Longest sessions", "Campaign book (Phase 2)", "Priority support"], tier: "adult" },
  b2b_camp: { name: "Camp Day", price: 39900, sessions: 999, features: ["Unlimited sessions (1 day)", "50+ kids", "Bulk Quest Codes", "Admin dashboard"], tier: "b2b" },
  b2b_classroom: { name: "Classroom", price: 17900, sessions: 60, features: ["60 sessions/month", "30 seats", "Admin dashboard", "Session caps"], tier: "b2b" },
  b2b_library: { name: "Library", price: 9900, sessions: 20, features: ["20 sessions/month", "Community access", "Simple management"], tier: "b2b" },
};

export function Billing() {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [plan, setPlan] = useState<string>(() => store.getPlan());

  const currentPlan = plan;
  const currentPlanInfo = PLAN_DETAILS[currentPlan];

  const handleUpgrade = async (planKey: string) => {
    if (!user) return;
    setLoadingPlan(planKey);
    try {
      // Phase 2: full Stripe checkout. For the MVP demo, apply the plan locally.
      setPlan(planKey);
      store.setPlan(planKey);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlan(null);
    }
  };

  if (!user) return null;

  return (
    <div className="page-container billing-page">
      <div className="page-header">
        <h1>Your Plan</h1>
        <p>Manage your subscription and upgrade for more adventures</p>
      </div>

      <div className="current-plan card">
        <h2>Current: {currentPlanInfo.name}</h2>
        <div className="plan-meta">
          <span>{currentPlanInfo.sessions} sessions/month</span>
          <span className="plan-price">{formatPrice(currentPlanInfo.price)}/mo</span>
        </div>
        <ul className="plan-features">
          {currentPlanInfo.features.map((f, i) => (
            <li key={i}><span className="check">✓</span> {f}</li>
          ))}
        </ul>
        {currentPlan !== "free" && (
          <button className="btn btn-secondary mt-1" onClick={() => handleUpgrade("free")}>
            Downgrade to Free
          </button>
        )}
      </div>

      <div className="plans-section">
        <h2>Available Plans</h2>
        
        <div className="plans-grid">
          {Object.entries(PLAN_DETAILS).filter(([k]) => k !== currentPlan && PLAN_DETAILS[k].tier === "kid").map(([key, plan]) => (
            <PlanCard key={key} plan={plan} planKey={key} current={false} onSelect={handleUpgrade} loading={loadingPlan === key} />
          ))}
        </div>

        <div className="plans-divider">
          <span>Adult Tiers (Phase 2 - ElevenLabs Voice)</span>
        </div>

        <div className="plans-grid">
          {Object.entries(PLAN_DETAILS).filter(([k]) => PLAN_DETAILS[k].tier === "adult").map(([key, plan]) => (
            <PlanCard key={key} plan={plan} planKey={key} current={false} onSelect={handleUpgrade} loading={loadingPlan === key} />
          ))}
        </div>

        <div className="plans-divider">
          <span>B2B Packages</span>
        </div>

        <div className="plans-grid">
          {Object.entries(PLAN_DETAILS).filter(([k]) => PLAN_DETAILS[k].tier === "b2b").map(([key, plan]) => (
            <PlanCard key={key} plan={plan} planKey={key} current={false} onSelect={handleUpgrade} loading={loadingPlan === key} />
          ))}
        </div>
      </div>

      <div className="adventure-pass card">
        <h3>Adventure Pass</h3>
        <p>Hit your monthly limit? Buy extra sessions on demand.</p>
        <div className="pass-options">
          <div className="pass-option">
            <h4>Kids Tiers</h4>
            <p>1 session — $5.99 | 3 sessions — $14.99</p>
          </div>
          <div className="pass-option">
            <h4>Adult Tiers</h4>
            <p>1 session — $17.99 | 3 sessions — $44.99</p>
          </div>
        </div>
        <p className="pass-note">Available when you reach your monthly session limit.</p>
      </div>
    </div>
  );
}

function PlanCard({ plan, planKey, current, onSelect, loading }: { 
  plan: typeof PLAN_DETAILS[string]; 
  planKey: string;
  current: boolean;
  onSelect: (key: string) => void;
  loading: boolean;
}) {
  const isUpgrade = plan.price > (PLAN_DETAILS[planKey as keyof typeof PLAN_DETAILS]?.price || 0);

  return (
    <div className={`card plan-card ${current ? "current" : ""} ${isUpgrade ? "upgrade" : ""}`}>
      <h3>{plan.name}</h3>
      <div className="plan-price-large">{formatPrice(plan.price)}<span>/mo</span></div>
      <p className="plan-sessions">{plan.sessions} sessions/month</p>
      <ul className="plan-features">
        {plan.features.map((f, i) => (
          <li key={i}><span className="check">✓</span> {f}</li>
        ))}
      </ul>
      {current ? (
        <span className="btn btn-secondary btn-full">Current Plan</span>
      ) : (
        <button className="btn btn-primary btn-full" onClick={() => onSelect(planKey)} disabled={loading}>
          {loading ? "Processing..." : plan.price === 0 ? "Select Free" : "Upgrade"}
        </button>
      )}
    </div>
  );
}

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}