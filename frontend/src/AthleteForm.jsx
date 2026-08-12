import { useState, useEffect } from "react";
import axios from "axios";

function generateAthleteId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `ATH-${datePart}-${randomPart}`;
}

function AthleteForm({ onAthleteAdded }) {
  const [form, setForm] = useState({
    athlete_id: "", name: "", sport_type: "", position: "",
    age: "", height: "", weight: "", injury_history: "", training_load: ""
  });

  useEffect(() => {
    setForm((prev) => ({ ...prev, athlete_id: generateAthleteId() }));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegenerateId = () => {
    setForm((prev) => ({ ...prev, athlete_id: generateAthleteId() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://127.0.0.1:8000/athletes/", form);
      alert("Athlete added successfully!");
      onAthleteAdded();
      setForm({
        athlete_id: generateAthleteId(), name: "", sport_type: "", position: "",
        age: "", height: "", weight: "", injury_history: "", training_load: ""
      });
    } catch (err) {
      alert("Error: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="card" style={{ marginBottom: "24px" }}>
      <h2 className="font-display" style={{ fontSize: "16px", marginTop: 0, marginBottom: "20px" }}>
        Add New Athlete
      </h2>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
          <div style={{ position: "relative" }}>
            <input
              className="input"
              name="athlete_id"
              placeholder="Athlete ID"
              value={form.athlete_id}
              onChange={handleChange}
              required
              style={{ paddingRight: "60px", fontFamily: "var(--font-mono)" }}
            />
            <button
              type="button"
              onClick={handleRegenerateId}
              title="Generate new ID"
              style={{
                position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                fontSize: "11px", color: "var(--blue-600)", fontWeight: 600
              }}
            >
              New
            </button>
          </div>
          <input className="input" name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required />
          <input className="input" name="sport_type" placeholder="Sport Type" value={form.sport_type} onChange={handleChange} />
          <input className="input" name="position" placeholder="Position" value={form.position} onChange={handleChange} />
          <input className="input" name="age" placeholder="Age" type="number" value={form.age} onChange={handleChange} />
          <input className="input" name="height" placeholder="Height (cm)" type="number" value={form.height} onChange={handleChange} />
          <input className="input" name="weight" placeholder="Weight (kg)" type="number" value={form.weight} onChange={handleChange} />
          <input className="input" name="injury_history" placeholder="Injury History" value={form.injury_history} onChange={handleChange} />
          <input className="input" name="training_load" placeholder="Training Load" value={form.training_load} onChange={handleChange} />
        </div>
        <button type="submit" className="btn btn-primary" style={{ marginTop: "18px" }}>
          Add Athlete
        </button>
      </form>
    </div>
  );
}

export default AthleteForm;