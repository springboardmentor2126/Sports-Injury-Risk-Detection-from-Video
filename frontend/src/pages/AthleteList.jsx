import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

const MANAGE_ROLES = ["coach", "physiotherapist", "sports_scientist", "admin"];

export default function AthleteList() {
  const [athletes, setAthletes] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const canManage = MANAGE_ROLES.includes(user?.role);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.listAthletes();
      setAthletes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this athlete profile?")) return;
    try {
      await api.deleteAthlete(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Athlete Profiles</h2>
        {canManage && <Link className="btn" to="/athletes/new">+ New Athlete</Link>}
      </div>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : athletes.length === 0 ? (
        <p>No athlete profiles yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Athlete Code</th>
              <th>Sport</th>
              <th>Position</th>
              <th>Age</th>
              <th>Height (cm)</th>
              <th>Weight (kg)</th>
              <th>Training Load</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {athletes.map((a) => (
              <tr key={a.id}>
                <td>{a.athlete_code}</td>
                <td>{a.sport_type}</td>
                <td>{a.position || "-"}</td>
                <td>{a.age}</td>
                <td>{a.height_cm}</td>
                <td>{a.weight_kg}</td>
                <td>{a.training_load || "-"}</td>
                <td className="table-actions">
                  <Link to={`/athletes/${a.id}`}>View</Link>
                  {canManage && (
                    <>
                      {" | "}
                      <Link to={`/athletes/${a.id}/edit`}>Edit</Link>
                      {" | "}
                      <button className="btn-link danger" onClick={() => handleDelete(a.id)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
