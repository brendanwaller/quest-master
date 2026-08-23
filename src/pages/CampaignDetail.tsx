// ============================================================================
// Quest Master - Campaign Detail. Campaign info, heroes, session history,
// and Enter Session (creates a new SessionLog and navigates to it).
// ============================================================================
import { Link, useNavigate, useParams } from "react-router-dom";
import { store } from "../lib/store";
import type { SessionLog } from "../lib/types";

export function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) return null;
  const campaign = store.getCampaign(id);
  if (!campaign) return <div className="empty-state card">Campaign not found</div>;

  const allCharacters = store.listCharacters();
  const heroes = allCharacters.filter((c) => campaign.characterIds.includes(c.id));
  const sessions = store
    .listSessions()
    .filter((s) => s.campaignId === campaign.id)
    .sort((a, b) => b.startedAt - a.startedAt);

  const handleEnterSession = () => {
    const session: SessionLog = {
      id: store.uid(),
      campaignId: campaign.id,
      startedAt: Date.now(),
      endedAt: null,
      summary: "",
      exchanges: [],
    };
    store.saveSession(session);
    store.saveCampaign({ ...campaign, sessionCount: campaign.sessionCount + 1 });
    navigate(`/session/${session.id}`);
  };

  return (
    <div className="page-container campaign-detail">
      <div className="page-header">
        <div>
          <h1>{campaign.name}</h1>
          <p className="campaign-meta">
            {campaign.setting} • Adventure level {campaign.ageTier} • Quest Code:{" "}
            <strong>{campaign.code}</strong>
          </p>
        </div>
        <button onClick={handleEnterSession} className="btn btn-primary">Enter Session</button>
      </div>

      <div className="campaign-content">
        <section className="card section">
          <h2>🛡️ Heroes</h2>
          {heroes.length === 0 ? (
            <p className="form-help">
              No heroes yet.{" "}
              <Link to={`/characters/new?campaign=${campaign.id}`}>Create a character</Link> to start.
            </p>
          ) : (
            <ul className="hero-list">
              {heroes.map((hero) => (
                <li key={hero.id}>
                  <strong>{hero.name}</strong> • {hero.hp}/{hero.maxHp} hearts • evolution stage {hero.variant}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card section">
          <h2>📜 Session History ({sessions.length})</h2>
          {sessions.length === 0 ? (
            <p className="form-help">No sessions yet. Your story starts with the first one.</p>
          ) : (
            <ul className="session-list">
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link to={s.endedAt ? `/session/${s.id}/recap` : `/session/${s.id}`}>
                    {new Date(s.startedAt).toLocaleString()} {s.endedAt ? "(recap)" : "(in progress)"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {campaign.nextHook && (
          <section className="card section">
            <h2>🪝 Next Hook</h2>
            <p>{campaign.nextHook}</p>
          </section>
        )}

        <Link to="/dashboard" className="btn btn-secondary">← Back to Dashboard</Link>
      </div>
    </div>
  );
}
