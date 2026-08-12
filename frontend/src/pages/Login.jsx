import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser, saveSession } from "../api/auth";
import logo from "../assets/athenix-logo.jpeg";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      saveSession(data);
      if (data.role === "Athlete" && !data.profile_completed) {
        navigate("/complete-profile", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Check your credentials.");
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
      <div className="card" style={{ width: "380px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
          <img src={logo} alt="Athenix" style={{ width: "48px", marginBottom: "10px" }} />
          <h1 className="font-display" style={{ fontSize: "20px", margin: 0 }}>Welcome back</h1>
          <p style={{ fontSize: "13px", color: "var(--slate-500)", margin: "4px 0 0" }}>Sign in to Athenix</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <input
              className="input" type="email" placeholder="Email"
              value={email} onChange={(e) => setEmail(e.target.value)} required
            />
            <div style={{ position: "relative" }}>
              <input
                className="input" type={showPassword ? "text" : "password"} placeholder="Password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                required style={{ paddingRight: "44px" }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", fontSize: "13px",
                color: "var(--slate-500)", fontFamily: "var(--font-mono)"
              }}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {error && <p style={{ color: "var(--risk-critical)", fontSize: "13px", marginTop: "12px" }}>{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: "18px" }}>
            {loading ? "Signing in…" : "Login"}
          </button>
        </form>
        <p style={{ fontSize: "13px", textAlign: "center", marginTop: "18px", color: "var(--slate-500)" }}>
          Don't have an account? <Link to="/register" style={{ color: "var(--blue-600)" }}>Register here</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;