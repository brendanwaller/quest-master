// ============================================================================
// Quest Master - Age tier selection (7-9 / 10-12 / 13+). Locked MVP step 2.
// ============================================================================
import { Navigate, useNavigate } from "react-router-dom";
import { store } from "../lib/store";
import { AGE_TIERS } from "../lib/types";
import type { AgeTierId } from "../lib/types";

export function AgeTierPage() {
  const navigate = useNavigate();
  if (!store.getCurrentUser()) return <Navigate to="/login" replace />;
  if (!store.hasConsent()) return <Navigate to="/consent" replace />;

  const pick = (tier: AgeTierId) => {
    store.setAgeTier(tier);
    navigate("/dashboard");
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Choose Your Adventure Level</h1>
        <p>How brave should the world be? Pick the tier that fits your table.</p>
      </div>
      <div className="campaigns-grid">
        {AGE_TIERS.map((tier) => (
          <button
            key={tier.id}
            type="button"
            className="card age-tier-card"
            onClick={() => pick(tier.id)}
            style={{ textAlign: "left", cursor: "pointer" }}
          >
            <h2>{tier.label}</h2>
            <p className="tier-tagline"><strong>{tier.tagline}</strong></p>
            <p>{tier.desc}</p>
            <p className="form-help">
              Threat level: {tier.threat} • Hearts per hero: {tier.maxHearts}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
