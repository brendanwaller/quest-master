import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { store } from "../lib/store";
import { DEMO_QUESTS } from "../lib/demoQuests";

export function StartDemoQuest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStartDemo = (questKey: string) => {
    setLoading(true);
    setError("");
    try {
      const quest = DEMO_QUESTS[questKey];
      const campaign = {
        id: store.uid(),
        name: quest.name,
        setting: quest.setting,
        ageTier: "10-12" as const,
        code: "",
        characterIds: [],
        sessionCount: 0,
        nextHook: quest.nextHook,
        createdAt: Date.now(),
      };
      store.saveCampaign(campaign);
      navigate(`/campaigns/${campaign.id}`);
    } catch {
      setError("Failed to start demo quest. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container demo-quest-page">
      <div className="page-header">
        <h1>Start a Demo Quest</h1>
        <p>Jump right into a pre-built adventure. No setup required.</p>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="demo-quests-grid">
        {Object.entries(DEMO_QUESTS).map(([key, quest]) => (
          <div key={key} className="card demo-quest-card">
            <div className="demo-quest-header">
              <span className="demo-quest-icon">◉</span>
              <div>
                <h2>{quest.name}</h2>
                <span className="demo-quest-setting">{quest.setting}</span>
              </div>
            </div>
            <p className="demo-quest-desc">{quest.description}</p>

            <div className="demo-quest-preview">
              <h3>What's Inside</h3>
              <ul>
                <li>{quest.npcs.length} NPCs — including a quest giver, informant, and antagonist</li>
                <li>{quest.encounters.length} encounters — from exploration to the final confrontation</li>
                <li>A memorable twist that changes everything</li>
                <li>A hook for the next session</li>
              </ul>
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={() => handleStartDemo(key)}
              disabled={loading}
            >
              {loading ? "Creating..." : `Start ${quest.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
