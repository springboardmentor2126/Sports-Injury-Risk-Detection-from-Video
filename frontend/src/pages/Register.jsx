import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../api/auth";
import logo from "../assets/athenix-logo.jpeg";

function Register() {
  const [form, setForm] = useState({
    fullName: "", email: "", password: "", confirmPassword: "", role: "Athlete"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await registerUser(form.fullName, form.email, form.password, form.confirmPassword, form.role);
      setSuccess("Registration successful! Redirecting to login…");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
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
      <div className="card" style={{ width: "400px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
          <img src={logo} alt="Athenix" style={{ width: "48px", marginBottom: "10px" }} />
          <h1 className="font-display" style={{ fontSize: "20px", margin: 0 }}>Create account</h1>
          <p style={{ fontSize: "13px", color: "var(--slate-500)", margin: "4px 0 0" }}>
            Join the Athenix platform
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <input
              className="input" name="fullName" placeholder="Full Name"
              value={form.fullName} onChange={handleChange} required
            />
            <input
              className="input" name="email" type="email" placeholder="Email"
              value={form.email} onChange={handleChange} required
            />
            <div style={{ position: "relative" }}>
              <input
                className="input" name="password" type={showPassword ? "text" : "password"}
                placeholder="Password" value={form.password} onChange={handleChange}
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
            <input
              className="input" name="confirmPassword" type="password" placeholder="Confirm Password"
              value={form.confirmPassword} onChange={handleChange} required
            />
            <select className="input" name="role" value={form.role} onChange={handleChange}>
              <option value="Athlete">Athlete</option>
              <option value="Coach">Coach</option>
            </select>
          </div>
          {error && <p style={{ color: "var(--risk-critical)", fontSize: "13px", marginTop: "12px" }}>{error}</p>}
          {success && <p style={{ color: "var(--risk-low)", fontSize: "13px", marginTop: "12px" }}>{success}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: "18px" }}>
            {loading ? "Registering…" : "Register"}
          </button>
        </form>
        <p style={{ fontSize: "13px", textAlign: "center", marginTop: "18px", color: "var(--slate-500)" }}>
          Already have an account? <Link to="/login" style={{ color: "var(--blue-600)" }}>Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;