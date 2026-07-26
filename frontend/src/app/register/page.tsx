"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, setToken } from "@/lib/api";

const ROLES = [
  { id: 1, label: "Athlete", desc: "Upload videos for personal movement analysis" },
  { id: 2, label: "Coach", desc: "Monitor team-wide injury risks and performance" },
  { id: 3, label: "Physiotherapist", desc: "Track athlete rehabilitation and recovery" },
  { id: 4, label: "Sports Scientist", desc: "Biomechanical research and data analytics" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role_id: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setLoading(true);
    try {
      await authApi.register(form);
      const tokenData = await authApi.login(form.email, form.password);
      setToken(tokenData.access_token);
      // Clear any cached analysis from a previous account session
      localStorage.removeItem("sg_last_analysis");
      router.push("/dashboard/profile?new=1");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8fafc",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
    }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>

        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <Link href="/" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#64748b",
            fontSize: "13px",
            textDecoration: "none",
            marginBottom: "20px",
            fontWeight: 500,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            Back to home
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{
              width: "32px", height: "32px",
              background: "#2563eb",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: "17px", color: "#0f172a" }}>SportGuard</span>
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
            Create your account
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px" }}>
            Free to use. No credit card required.
          </p>
        </div>

        {/* Form card */}
        <div className="sg-card">
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {error && <div className="sg-alert sg-alert-error">{error}</div>}

            {/* Name row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label className="sg-label" htmlFor="first_name">First name</label>
                <input
                  id="first_name"
                  className="sg-input"
                  placeholder="Alex"
                  value={form.first_name}
                  onChange={e => set("first_name", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="sg-label" htmlFor="last_name">Last name</label>
                <input
                  id="last_name"
                  className="sg-input"
                  placeholder="Johnson"
                  value={form.last_name}
                  onChange={e => set("last_name", e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="sg-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="sg-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                required
              />
            </div>

            <div>
              <label className="sg-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="sg-input"
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={e => set("password", e.target.value)}
                required
              />
            </div>

            {/* Role selection */}
            <div>
              <label className="sg-label" style={{ marginBottom: "10px" }}>Your role</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {ROLES.map(role => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => set("role_id", role.id)}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      border: form.role_id === role.id
                        ? "2px solid #2563eb"
                        : "1.5px solid #e2e8f0",
                      background: form.role_id === role.id ? "#eff6ff" : "#ffffff",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{
                      fontWeight: 600,
                      fontSize: "13px",
                      color: form.role_id === role.id ? "#1d4ed8" : "#0f172a",
                      marginBottom: "3px",
                    }}>
                      {role.label}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>
                      {role.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="sg-btn sg-btn-primary"
              disabled={loading}
              style={{ width: "100%", padding: "12px", fontSize: "15px" }}
            >
              {loading
                ? <><span className="sg-spinner" /> Creating account...</>
                : "Create Account"}
            </button>
          </form>

          <hr className="sg-divider" />

          <p style={{ textAlign: "center", fontSize: "14px", color: "#64748b" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
