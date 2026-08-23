// ============================================================================
// Quest Master - Dashboard. Lists campaigns from localStorage store.
// ============================================================================
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { store } from "../lib/store";
import type { AgeTierId } from "../lib/types";

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const campaigns = store.listCampaigns();

  if (!user) return null;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <div>
              <h1>Welcome back, {user.name}</h1>
              <p className="plan-badge">Adventure level: {store.getAgeTier() ?? "unset"}</p>
            </div>
            <div className="header-actions">
              <button onClick={logout} className="btn btn-secondary">Sign Out</button>
              <Link to="/billing" className="btn btn-primary">Manage Plan</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="container">
          <div className="dashboard-toolbar">
            <h2>Your Campaigns</h2>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                className="btn btn-secondary"
                onClick={() => navigate("/join/ENTER")}
                title="Enter a Quest Code on the join screen"
              >
                Join with Quest Code
              </button>
              <Link to="/campaigns/new" className="btn btn-primary">+ New Campaign</Link>
            </div>
          </div>

          {campaigns.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-icon">🏰</div>
              <h3>No campaigns yet</h3>
              <p>Create your first world and start an adventure</p>
              <div className="empty-actions">
                <Link to="/campaigns/new" className="btn btn-primary mt-1">Create Campaign</Link>
                <Link to="/demo-quest" className="btn btn-secondary mt-1">Start Demo Quest</Link>
              </div>
            </div>
          ) : (
            <div className="campaigns-grid">
              {campaigns.map((c) => {
                const heroCount = c.characterIds.length || store.listCharacters().length;
                return (
                  <Link key={c.id} to={`/campaigns/${c.id}`} className="campaign-card card">
                    <div className="campaign-header">
                      <h3>{c.name}</h3>
                      <span className="badge">{String(c.ageTier as AgeTierId)}</span>
                    </div>
                    <p>{c.setting}</p>
                    <p className="form-help">
                      {heroCount} hero{heroCount === 1 ? "" : "s"} • {c.sessionCount} session{c.sessionCount === 1 ? "" : "s"}
                    </p>
                    {c.nextHook && <p className="tier-tagline">Next hook: {c.nextHook}</p>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
