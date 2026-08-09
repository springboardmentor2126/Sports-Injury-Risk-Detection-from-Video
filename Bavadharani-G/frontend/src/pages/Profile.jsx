import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

const emptyProfile = {
  sport_type: "", position: "", age: "", height_cm: "", weight_kg: "", injury_history: "", training_load: "",
};

export default function Profile() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    api.getMyProfile(token).then((data) => setForm({ ...emptyProfile, ...data })).catch(() => {}).finally(() => setLoading(false));
  }, [token, navigate]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        ...form,
        age: form.age === "" ? null : Number(form.age),
        height_cm: form.height_cm === "" ? null : Number(form.height_cm),
        weight_kg: form.weight_kg === "" ? null : Number(form.weight_kg),
      };
      await api.saveMyProfile(payload, token);
      setMessage({ type: "success", text: "Profile saved." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-center">Loading profile...</div>;

  return (
    <div className="page-center">
      <form className="card wide" onSubmit={handleSubmit}>
        <h1>Athlete profile</h1>
        <p className="subtitle">{user ? `Signed in as ${user.full_name} (${user.role})` : "Manage your details"}</p>
        {message && <div className={`msg ${message.type}`}>{message.text}</div>}

        <div className="row">
          <div><label>Sport type</label><input value={form.sport_type || ""} onChange={update("sport_type")} placeholder="e.g. Football" /></div>
          <div><label>Position</label><input value={form.position || ""} onChange={update("position")} placeholder="e.g. Striker" /></div>
        </div>
        <div className="row-3">
          <div><label>Age</label><input type="number" value={form.age ?? ""} onChange={update("age")} min="10" max="80" /></div>
          <div><label>Height (cm)</label><input type="number" value={form.height_cm ?? ""} onChange={update("height_cm")} /></div>
          <div><label>Weight (kg)</label><input type="number" value={form.weight_kg ?? ""} onChange={update("weight_kg")} /></div>
        </div>
        <label>Injury history</label>
        <textarea value={form.injury_history || ""} onChange={update("injury_history")} placeholder="e.g. ACL tear (left knee), 2023 — fully recovered" />
        <label>Training load</label>
        <input value={form.training_load || ""} onChange={update("training_load")} placeholder="e.g. 5 sessions per week, 90 min each" />

        <button className="primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
      </form>
    </div>
  );
}
