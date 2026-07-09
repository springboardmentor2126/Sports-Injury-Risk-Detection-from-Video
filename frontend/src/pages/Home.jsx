import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="page">
      <div className="card hero">
        <h1>Sports Injury Risk Detection Platform</h1>
        <p>
          Analyzes athlete movement to identify biomechanical issues, detect abnormal
          movement patterns, and predict injury risk before it happens.
        </p>
        {user ? (
          <>
            <p>Welcome back, <strong>{user.full_name}</strong> ({user.role})</p>
            <Link className="btn" to="/athletes">Go to Athlete Profiles</Link>
          </>
        ) : (
          <Link className="btn" to="/login">Login to get started</Link>
        )}
      </div>
    </div>
  );
}
