import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

const ROLES = ["athlete", "coach", "physiotherapist", "sports_scientist", "admin"];

export default function Register() {
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", role: "athlete",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.register(form);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card" onSubmit={handleSubmit}>
        <h2>Create Account</h2>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">Account created! Redirecting to login...</p>}

        <label>Full Name</label>
        <input name="full_name" value={form.full_name} onChange={handleChange} required />

        <label>Email</label>
        <input type="email" name="email" value={form.email} onChange={handleChange} required />

        <label>Password</label>
        <input type="password" name="password" value={form.password} onChange={handleChange} required />

        <label>Role</label>
        <select name="role" value={form.role} onChange={handleChange}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r.replace("_", " ")}</option>
          ))}
        </select>

        <button type="submit" disabled={loading}>{loading ? "Creating..." : "Register"}</button>
        <p>Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </div>
  );
}
