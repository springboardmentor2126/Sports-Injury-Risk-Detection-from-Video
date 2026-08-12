import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeProfile, saveSession, getSession } from "../api/auth";
import logo from "../assets/athenix-logo.jpeg";

function generateAthleteId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `ATH-${datePart}-${randomPart}`;
}

function CompleteProfile() {
  const [form, setForm] = useState({
    athlete_id: generateAthleteId(),
    sport_type: "", position: "", age: "", height: "", weight: "",
    injury_history: "None", training_load: "Moderate"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { name } = getSession();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await completeProfile({
        ...form,
        age: form.age ? parseInt(form.age) : null,
        height: form.height ? parseFloat(form.height) : null,
        weight: form.weight ? parseFloat(form.weight) : null,
      });
      saveSession({
        access_token: data.access_token,
        role: "Athlete",
        full_name: name,
        profile_completed: true
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--navy-950)", position: "relative", overflow: "hidden"
    }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle, rgba(56,189,248,0.15) 1px, transparent 1.4px)",
        backgroundSize: "22px 22px", opacity: 0.5
      }} />
      <div className="card" style={{ width: "480px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
          <img src={logo} alt="Athenix" style={{ width: "40px", marginBottom: "10px" }} />
          <h1 className="font-display" style={{ fontSize: "20px", margin: 0 }}>Complete your profile</h1>
          <p style={{ fontSize: "13px", color: "var(--slate-500)", margin: "4px 0 0" }}>
            Welcome, {name}. One more step before your dashboard.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div style={{ gridColumn: "1 / -1", position: "relative" }}>
              <input
                className="input" name="athlete_id" placeholder="Athlete ID"
                value={form.athlete_id} onChange={handleChange} required
                style={{ fontFamily: "var(--font-mono)", paddingRight: "60px" }}
              />
              <button type="button"
                onClick={() => setForm(f => ({ ...f, athlete_id: generateAthleteId() }))}
                style={{
                  position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "11px", color: "var(--blue-600)", fontWeight: 600
                }}>
                New
              </button>
            </div>
            <input className="input" name="sport_type" placeholder="Sport Type" value={form.sport_type} onChange={handleChange} />
            <input className="input" name="position" placeholder="Position" value={form.position} onChange={handleChange} />
            <input className="input" name="age" placeholder="Age" type="number" value={form.age} onChange={handleChange} />
            <input className="input" name="height" placeholder="Height (cm)" type="number" value={form.height} onChange={handleChange} />
            <input className="input" name="weight" placeholder="Weight (kg)" type="number" value={form.weight} onChange={handleChange} />
            <div style={{ gridColumn: "1 / -1" }}>
  <label
    style={{
      fontSize: "12px",
      color: "var(--slate-500)",
      display: "block",
      marginBottom: "4px",
    }}
  >
    Previous Injury History
  </label>

  <input
    className="input"
    name="injury_history"
    placeholder="e.g. None, ACL 2023, Hamstring strain"
    value={form.injury_history}
    onChange={handleChange}
  />
</div>

<div style={{ gridColumn: "1 / -1" }}>
  <label
    style={{
      fontSize: "12px",
      color: "var(--slate-500)",
      display: "block",
      marginBottom: "4px",
    }}
  >
    Training Load
  </label>

  <select
    className="input"
    name="training_load"
    value={form.training_load}
    onChange={handleChange}
  >
    <option value="Low">Low</option>
    <option value="Moderate">Moderate</option>
    <option value="High">High</option>
    <option value="Very High">Very High</option>
  </select>
</div>
          </div>
          {error && <p style={{ color: "var(--risk-critical)", fontSize: "13px", marginTop: "12px" }}>{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: "18px" }}>
            {loading ? "Saving…" : "Save & Go to Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CompleteProfile;