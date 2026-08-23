// ============================================================================
// Quest Master - Session Recap. What happened, XP and milestones, avatar
// evolution hint, and a kid-friendly "continue tomorrow" cliffhanger.
// ============================================================================
import { Link, useNavigate, useParams } from "react-router-dom";
import { store } from "../lib/store";
import type { SessionLog } from "../lib/types";

const CLIFFHANGERS = [
  "A faint glow pulses from deeper in the mine. Whatever made it knows your names now.",
  "The map's last corner is torn away. Tomorrow, the trail continues.",
  "Somewhere behind you, a door you never opened slowly creaks shut.",
];

function cliffhangerFor(sessionId: string): string {
  let hash = 0;
  for (const ch of sessionId) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return CLIFFHANGERS[hash % CLIFFHANGERS.length];
}

export function SessionRecap() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) return null;
  const session: SessionLog | null = store.getSession(id);
  if (!session) return <div className="empty-state card">Session not found</div>;

  const campaign = store.getCampaign(session.campaignId);
  const heroes = store.listCharacters().filter((c) => campaign?.characterIds.includes(c.id));
  const playerTurns = session.exchanges.filter((e) => e.role === "player").length;
  const minutes =
    session.endedAt && session.startedAt
      ? Math.max(1, Math.round((session.endedAt - session.startedAt) / 60000))
      : null;

  // Simple milestone math: one XP per brave choice, plus a bonus per hero turn.
  const xpEarned = playerTurns * 10 + heroes.length * 5;
  const milestones = Math.floor(xpEarned / 25);

  return (
    <div className="page-container session-recap">
      <div className="recap-header">
        <div className="recap-header-content">
          <span className="recap-orb-icon">◉</span>
          <div>
            <h1>Session Recap</h1>
            <p className="recap-subtitle">
              {campaign?.name ?? "Campaign"} •{" "}
              {new Date(session.startedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              {minutes ? ` • ${minutes} min` : ""}
            </p>
          </div>
        </div>
        <div className="recap-actions">
          <button className="btn btn-secondary" onClick={() => navigate(`/campaigns/${session.campaignId}`)}>
            ← Back to Campaign
          </button>
        </div>
      </div>

      <section className="card recap-summary">
        <h2>📜 The Story So Far</h2>
        {session.summary ? (
          <p>{session.summary}</p>
        ) : (
          <p>
            You ventured into the adventure together, made brave choices ({playerTurns}
            {" "}bold move{playerTurns === 1 ? "" : "s"}), and the tale grew bigger because of it.
          </p>
        )}
      </section>

      <section className="card recap-xp">
        <h2>⭐ XP &amp; Milestones</h2>
        <p><strong>+{xpEarned} XP</strong> earned this session</p>
        <p>{milestones} milestone{milestones === 1 ? "" : "s"} reached</p>
      </section>

      <section className="card recap-avatar">
        <h2>🧬 Evolving Avatar</h2>
        <p>
          {heroes.length > 0
            ? `${heroes.map((h) => h.name).join(", ")} ${heroes.length === 1 ? "is" : "are"} growing.`
            : "Your heroes are growing."}{" "}
          Keep adventuring to unlock the next evolution stage: new colors, a stronger emblem,
          and a familiar that follows you between campaigns.
        </p>
      </section>

      <section className="card recap-cliffhanger">
        <h2>🌙 Continue Tomorrow</h2>
        <p className="tier-tagline">{cliffhangerFor(session.id)}</p>
        <div className="empty-actions" style={{ marginTop: "1rem" }}>
          <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
          {!session.endedAt && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                store.saveSession({ ...session, endedAt: Date.now() });
                navigate(`/campaigns/${session.campaignId}`);
              }}
            >
              Close Session
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
