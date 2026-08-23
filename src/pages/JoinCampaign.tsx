// ============================================================================
// Quest Master - Join Campaign via 6-character Quest Code. localStorage only.
// ============================================================================
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { store } from "../lib/store";

export function JoinCampaign() {
  const params = useParams<{ code: string }>();
  const navigate = useNavigate();
  const urlCode = (params.code ?? "").toUpperCase();
  const prefilled = /^[A-Z0-9]{6}$/.test(urlCode) ? urlCode : "";
  const [code, setCode] = useState(prefilled);
  const [error, setError] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const normalized = code.trim().toUpperCase();
    if (normalized.length !== 6) {
      setError("Quest Codes are exactly 6 characters.");
      return;
    }
    const campaign = store.listCampaigns().find((c) => c.code === normalized);
    if (!campaign) {
      setError("No campaign found for that Quest Code. Check with your Game Master.");
      return;
    }
    navigate(`/campaigns/${campaign.id}`);
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-header">
          <span className="logo-orb">◉</span>
          <h1>Join Campaign</h1>
          <p>Enter the Quest Code from your Game Master</p>
        </div>
        <form onSubmit={handleJoin} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <div className="form-group">
            <label htmlFor="code">Quest Code</label>
            <input
              id="code"
              type="text"
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="AB12CD"
              maxLength={6}
              required
              style={{ letterSpacing: "0.3em", textAlign: "center", fontSize: "1.5rem" }}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full">Join Adventure</button>
        </form>
        <p className="auth-footer">
          No code yet? <Link to="/dashboard">Back to Dashboard</Link>
        </p>
      </div>
    </div>
  );
}
