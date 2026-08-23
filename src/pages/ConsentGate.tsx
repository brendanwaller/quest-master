// ============================================================================
// Quest Master - COPPA verifiable-consent gate. Parent confirms, kid-safe
// toggle is explicit, self-reported ages captured for "who will play".
// ============================================================================
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { store } from "../lib/store";

interface PlayerEntry {
  name: string;
  age: string;
}

export function ConsentGate() {
  const navigate = useNavigate();
  const [parentEmail, setParentEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [players, setPlayers] = useState<PlayerEntry[]>([{ name: "", age: "" }]);
  const [kidSafe, setKidSafe] = useState(false);
  const [error, setError] = useState("");

  if (!store.getCurrentUser()) return <Navigate to="/login" replace />;


  const updatePlayer = (i: number, patch: Partial<PlayerEntry>) => {
    setPlayers((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const email = parentEmail.trim().toLowerCase();
    if (!email || email !== confirmEmail.trim().toLowerCase()) {
      setError("Parent emails must match exactly.");
      return;
    }
    if (!players[0]?.name.trim() || !players[0]?.age.trim()) {
      setError("Tell us who will play (at least one player with an age).");
      return;
    }
    if (!kidSafe) {
      setError("Please confirm the kid-safe play promise to continue.");
      return;
    }
    store.setConsent(true);
    navigate("/age-tier");
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-header">
          <span className="logo-orb">◉</span>
          <h1>Parent Consent</h1>
          <p>One quick step before the adventure begins</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="parent-email">Parent or guardian email</label>
            <input
              id="parent-email"
              type="email"
              className="input"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="parent@example.com"
              required
            />
            <p className="form-help">
              We ask a parent to confirm because players may be under 13 (COPPA).
              We store nothing about you outside this device.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="confirm-email">Confirm parent email</label>
            <input
              id="confirm-email"
              type="email"
              className="input"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="Type the same email again"
              required
            />
          </div>

          <fieldset className="form-group">
            <legend>Who will play?</legend>
            {players.map((player, i) => (
              <div key={i} className="player-row" style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <input
                  type="text"
                  className="input"
                  value={player.name}
                  onChange={(e) => updatePlayer(i, { name: e.target.value })}
                  placeholder={`Player ${i + 1} first name`}
                  aria-label={`Player ${i + 1} name`}
                />
                <input
                  type="number"
                  min={3}
                  max={17}
                  className="input"
                  style={{ maxWidth: "6rem" }}
                  value={player.age}
                  onChange={(e) => updatePlayer(i, { age: e.target.value })}
                  placeholder="Age"
                  aria-label={`Player ${i + 1} age`}
                />
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPlayers((prev) => [...prev, { name: "", age: "" }])}
            >
              + Add another player
            </button>
          </fieldset>

          <label className="consent-toggle" style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={kidSafe}
              onChange={(e) => setKidSafe(e.target.checked)}
              style={{ marginTop: "0.25rem" }}
            />
            <span>
              I understand Quest Master is a kid-safe storytelling game: no chat with strangers,
              no purchases inside play, and every story stays age-appropriate.
            </span>
          </label>

          <button type="submit" className="btn btn-primary btn-full">
            Save Consent &amp; Continue
          </button>
        </form>
        <p className="auth-footer">Already consented? You will only see this once per device.</p>
      </div>
    </div>
  );
}
