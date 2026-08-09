import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "athlete" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.register(form);
      navigate("/login", { state: { justRegistered: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Create account</h1>
        <p className="subtitle">Set up your athlete or coach profile</p>
        {error && <div className="msg error">{error}</div>}

        <label>Full name</label>
        <input value={form.full_name} onChange={update("full_name")} required />
        <label>Email</label>
        <input type="email" value={form.email} onChange={update("email")} required />
        <label>Password</label>
        <input type="password" value={form.password} onChange={update("password")} required minLength={6} />

        <label>I am a...</label>
        <div className="role-toggle">
          <button type="button" className={form.role === "athlete" ? "active" : ""} onClick={() => setForm({ ...form, role: "athlete" })}>Athlete</button>
          <button type="button" className={form.role === "coach" ? "active" : ""} onClick={() => setForm({ ...form, role: "coach" })}>Coach</button>
        </div>

        <button className="primary" type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>
        <p className="link-line">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
