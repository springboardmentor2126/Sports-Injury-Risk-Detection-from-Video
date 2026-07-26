"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      setToken(data.access_token);
      // Clear any cached analysis from a previous account session
      localStorage.removeItem("sg_last_analysis");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Incorrect email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8fafc",
      display: "flex",
    }}>
      {/* Left panel */}
      <div style={{
        flex: 1,
        background: "#0f172a",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "48px",
        maxWidth: "480px",
      }}
        className="hidden-mobile"
      >
        <div style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "40px" }}>
            <div style={{
              width: "36px", height: "36px",
              background: "#2563eb",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: "18px", color: "#ffffff" }}>SportGuard</span>
          </div>
          <h2 style={{ fontSize: "26px", fontWeight: 700, color: "#f8fafc", marginBottom: "12px", lineHeight: 1.3 }}>
            AI-powered injury prevention for serious athletes
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "15px", lineHeight: 1.7 }}>
            Analyse movement videos, detect biomechanical risks, and keep your athletes performing at their best.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {["YOLOv8 Pose Estimation", "Joint Angle Biomechanics", "XGBoost Risk Scoring", "Recovery Recommendations"].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2563eb", flexShrink: 0 }} />
              <span style={{ color: "#cbd5e1", fontSize: "14px" }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}>
        <div style={{ width: "100%", maxWidth: "380px" }}>
          <Link href="/" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#64748b",
            fontSize: "13px",
            textDecoration: "none",
            marginBottom: "32px",
            fontWeight: 500,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            Back to home
          </Link>

          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
            Welcome back
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "28px" }}>
            Sign in to your SportGuard account
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {error && <div className="sg-alert sg-alert-error">{error}</div>}

            <div>
              <label className="sg-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="sg-input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="sg-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="sg-input"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="sg-btn sg-btn-primary"
              disabled={loading}
              style={{ width: "100%", padding: "12px", fontSize: "15px", marginTop: "4px" }}
            >
              {loading ? <><span className="sg-spinner" /> Signing in...</> : "Sign In"}
            </button>
          </form>

          <hr className="sg-divider" />

          <p style={{ textAlign: "center", fontSize: "14px", color: "#64748b" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
