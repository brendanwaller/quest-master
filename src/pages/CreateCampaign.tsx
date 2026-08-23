// ============================================================================
// Quest Master - Create Campaign. Saves to localStorage, shows Quest Code.
// ============================================================================
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { store } from "../lib/store";
import { AGE_TIERS } from "../lib/types";
import type { AgeTierId, Campaign } from "../lib/types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeQuestCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

const STARTER_ADVENTURES = [
  {
    id: "hollow-mine",
    name: "The Hollow Mine",
    hook: "Glittering lights have been seen deep in the old mine, and the miners will not go back.",
  },
];

export function CreateCampaign() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [ageTier, setAgeTier] = useState<AgeTierId>((store.getAgeTier() as AgeTierId) ?? "7-9");
  const [adventureId, setAdventureId] = useState("hollow-mine");
  const [created, setCreated] = useState<Campaign | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Give your campaign a name.");
      return;
    }
    const adventure = STARTER_ADVENTURES.find((a) => a.id === adventureId) ?? STARTER_ADVENTURES[0];
    const campaign: Campaign = {
      id: store.uid(),
      name: name.trim(),
      setting: adventure.name,
      ageTier,
      code: makeQuestCode(),
      characterIds: [],
      sessionCount: 0,
      nextHook: adventure.hook,
      createdAt: Date.now(),
    };
    store.saveCampaign(campaign);
    setCreated(campaign);
  };

  if (created) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Campaign Created!</h1>
          <p>Share this Quest Code so friends can join</p>
        </div>
        <div className="card empty-state">
          <div className="empty-icon">🗝️</div>
          <h2 className="quest-code" style={{ fontSize: "2.5rem", letterSpacing: "0.3em" }}>{created.code}</h2>
          <p>{created.name} • {created.setting}</p>
          <div className="empty-actions">
            <button className="btn btn-primary" onClick={() => navigate(`/campaigns/${created.id}`)}>
              Go to Campaign
            </button>
            <Link to="/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Create Campaign</h1>
        <p>Name your world, pick the adventure level, and choose a starter quest</p>
      </div>
      <form onSubmit={handleSubmit} className="card create-form">
        {error && <div className="auth-error">{error}</div>}
        <div className="form-group">
          <label htmlFor="name">Campaign Name</label>
          <input
            id="name"
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The Lost Kingdom of Eldoria"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="age-tier">Adventure Level</label>
          <select
            id="age-tier"
            className="input"
            value={ageTier}
            onChange={(e) => setAgeTier(e.target.value as AgeTierId)}
          >
            {AGE_TIERS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="adventure">Starter Adventure</label>
          <select
            id="adventure"
            className="input"
            value={adventureId}
            onChange={(e) => setAdventureId(e.target.value)}
          >
            {STARTER_ADVENTURES.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <p className="form-help">{STARTER_ADVENTURES[0].hook}</p>
        </div>

        <button type="submit" className="btn btn-primary btn-full">Create Campaign</button>
      </form>
    </div>
  );
}
