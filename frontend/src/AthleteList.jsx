import { useEffect, useState } from "react";
import axios from "axios";

function AthleteList({ refreshKey }) {
  const [athletes, setAthletes] = useState([]);

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/athletes/")
      .then(res => setAthletes(res.data))
      .catch(err => console.error(err));
  }, [refreshKey]);

  return (
    <div className="card">
      <h2 className="font-display" style={{ fontSize: "16px", marginTop: 0, marginBottom: "16px" }}>
        Registered Athletes
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--slate-500)", marginLeft: "10px" }}>
          {athletes.length} total
        </span>
      </h2>

      {athletes.length === 0 ? (
        <p style={{ color: "var(--slate-500)", fontSize: "14px" }}>
          No athletes registered yet. Add one using the form above.
        </p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Athlete ID</th>
              <th>Name</th>
              <th>Sport</th>
              <th>Position</th>
              <th>Age</th>
              <th>Injury History</th>
              <th>Training Load</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map(a => (
              <tr key={a.id}>
                <td className="font-mono">{a.athlete_id}</td>
                <td>{a.name}</td>
                <td>{a.sport_type || "—"}</td>
                <td>{a.position || "—"}</td>
                <td>{a.age || "—"}</td>
                <td>{a.injury_history || "—"}</td>
                <td>{a.training_load || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AthleteList;