import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { access_token } = await api.login(form);
      const user = await api.getMe(access_token);
      login(access_token, user);
      navigate("/videos");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Log in</h1>
        <p className="subtitle">Access your injury risk dashboard</p>
        {location.state?.justRegistered && <div className="msg success">Account created — log in to continue.</div>}
        {error && <div className="msg error">{error}</div>}

        <label>Email</label>
        <input type="email" value={form.email} onChange={update("email")} required />
        <label>Password</label>
        <input type="password" value={form.password} onChange={update("password")} required />

        <button className="primary" type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </button>
        <p className="link-line">Don't have an account? <Link to="/register">Register</Link></p>
      </form>
    </div>
  );
}
