import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";

export default function AthleteDetail() {
  const { id } = useParams();
  const [athlete, setAthlete] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getAthlete(id).then(setAthlete).catch((err) => setError(err.message));
  }, [id]);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!athlete) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page">
      <h2>{athlete.athlete_code}</h2>
      <div className="card">
        <p><strong>Sport Type:</strong> {athlete.sport_type}</p>
        <p><strong>Position:</strong> {athlete.position || "-"}</p>
        <p><strong>Age:</strong> {athlete.age}</p>
        <p><strong>Height:</strong> {athlete.height_cm} cm</p>
        <p><strong>Weight:</strong> {athlete.weight_kg} kg</p>
        <p><strong>Training Load:</strong> {athlete.training_load || "-"}</p>
        <p><strong>Injury History:</strong> {athlete.injury_history || "None recorded"}</p>
      </div>
      <div className="detail-actions">
        <Link className="btn" to={`/videos/upload?athlete_id=${athlete.id}`}>Upload Movement Video</Link>
        <Link to="/athletes">&larr; Back to list</Link>
      </div>
    </div>
  );
}
