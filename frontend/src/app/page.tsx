"use client";
import Link from "next/link";

const features = [
  {
    title: "Pose Estimation",
    desc: "YOLOv8 AI detects 17 body keypoints per frame to map exact athlete movement.",
    tag: "Computer Vision",
    tagClass: "sg-badge-blue",
  },
  {
    title: "Biomechanical Analysis",
    desc: "Calculates joint angles, trunk lean, and asymmetry from extracted skeleton data.",
    tag: "Sports Science",
    tagClass: "sg-badge-green",
  },
  {
    title: "Risk Scoring",
    desc: "XGBoost model predicts injury probability based on movement patterns and history.",
    tag: "Predictive AI",
    tagClass: "sg-badge-amber",
  },
  {
    title: "Recovery Recommendations",
    desc: "AI-generated corrective exercise plans tailored to detected movement deficiencies.",
    tag: "Personalised",
    tagClass: "sg-badge-green",
  },
  {
    title: "Role-Based Access",
    desc: "Separate views and permissions for athletes, coaches, physiotherapists, and scientists.",
    tag: "Multi-Role",
    tagClass: "sg-badge-blue",
  },
  {
    title: "Progress Tracking",
    desc: "Compare movement quality scores over time with detailed session history reports.",
    tag: "Analytics",
    tagClass: "sg-badge-slate",
  },
];

const roles = [
  { label: "Athlete", desc: "Upload and track your own movement sessions" },
  { label: "Coach", desc: "Monitor team-wide injury risk and performance" },
  { label: "Physiotherapist", desc: "Oversee rehabilitation and recovery progress" },
  { label: "Sports Scientist", desc: "Deep biomechanical research and analytics" },
];

export default function LandingPage() {
  return (
    <div style={{ background: "#ffffff", color: "#0f172a" }}>

      {/* ── Navbar ── */}
      <nav style={{
        background: "#0f172a",
        borderBottom: "1px solid #1e293b",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div className="sg-container" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "60px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
            <span style={{ fontWeight: 700, fontSize: "17px", color: "#ffffff", letterSpacing: "-0.02em" }}>
              SportGuard
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Link href="/login" style={{
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: 500,
              color: "#94a3b8",
              textDecoration: "none",
              borderRadius: "6px",
              transition: "color 0.15s",
            }}>
              Sign In
            </Link>
            <Link href="/register" className="sg-btn sg-btn-primary" style={{ fontSize: "14px", padding: "8px 18px" }}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        background: "#0f172a",
        padding: "80px 24px 90px",
        textAlign: "center",
      }}>
        <div className="sg-container">
          <span className="sg-badge sg-badge-blue" style={{ marginBottom: "20px", display: "inline-flex" }}>
            AI-Powered Sports Injury Prevention
          </span>
          <h1 style={{
            fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
            fontWeight: 800,
            color: "#f8fafc",
            marginBottom: "20px",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
          }}>
            Detect Injury Risks
            <br />
            <span style={{ color: "#60a5fa" }}>Before They Happen</span>
          </h1>
          <p style={{
            fontSize: "17px",
            color: "#94a3b8",
            maxWidth: "580px",
            margin: "0 auto 36px",
            lineHeight: 1.7,
          }}>
            Upload athlete movement videos and let our AI engine analyse biomechanics,
            detect dangerous movement patterns, and generate personalised injury-prevention plans.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" className="sg-btn sg-btn-primary" style={{ padding: "12px 28px", fontSize: "15px" }}>
              Start for Free
            </Link>
            <Link href="/login" className="sg-btn" style={{
              padding: "12px 28px",
              fontSize: "15px",
              background: "transparent",
              color: "#94a3b8",
              border: "1.5px solid #334155",
            }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: "80px 24px", background: "#f8fafc" }}>
        <div className="sg-container">
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
              Everything you need to protect athletes
            </h2>
            <p style={{ color: "#64748b", fontSize: "16px" }}>
              Built for athletes, coaches, physiotherapists, and sports scientists.
            </p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
          }}>
            {features.map((f) => (
              <div key={f.title} className="sg-card" style={{ transition: "box-shadow 0.2s, transform 0.2s" }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
                  el.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = "";
                  el.style.transform = "";
                }}
              >
                <span className={`sg-badge ${f.tagClass}`} style={{ marginBottom: "12px", display: "inline-flex" }}>
                  {f.tag}
                </span>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section style={{ padding: "80px 24px", background: "#ffffff" }}>
        <div className="sg-container">
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
              Built for every member of the sports team
            </h2>
            <p style={{ color: "#64748b", fontSize: "16px" }}>
              Select your role when registering to get a tailored experience.
            </p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}>
            {roles.map((r) => (
              <div key={r.label} style={{
                padding: "24px",
                border: "1.5px solid #e2e8f0",
                borderRadius: "12px",
                background: "#ffffff",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "#2563eb";
                  el.style.boxShadow = "0 4px 16px rgba(37,99,235,0.12)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "#e2e8f0";
                  el.style.boxShadow = "";
                }}
              >
                <p style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a", marginBottom: "6px" }}>
                  {r.label}
                </p>
                <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "80px 24px", background: "#0f172a", textAlign: "center" }}>
        <div className="sg-container">
          <h2 style={{ fontSize: "28px", fontWeight: 700, color: "#f8fafc", marginBottom: "12px" }}>
            Ready to protect your athletes?
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "16px", marginBottom: "32px" }}>
            Create a free account and start analysing movement videos in minutes.
          </p>
          <Link href="/register" className="sg-btn sg-btn-primary" style={{ padding: "14px 32px", fontSize: "15px" }}>
            Create a Free Account
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: "1px solid #e2e8f0",
        padding: "24px",
        textAlign: "center",
        color: "#64748b",
        fontSize: "13px",
        background: "#ffffff",
      }}>
        © 2025 SportGuard. Built for Infosys Springboard.
      </footer>
    </div>
  );
}
