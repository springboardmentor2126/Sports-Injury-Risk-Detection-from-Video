import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession, getSession } from "../api/auth";
import { useVideoAnalysis } from "../contexts/VideoAnalysisContext";
import BiomechanicsReport from "../components/BiomechanicsReport";
import ReportHistory from "../components/ReportHistory";
import ProfileDropdown from "../components/ProfileDropdown";
import ProfileModal from "../components/ProfileModal";
import SettingsModal from "../components/SettingsModal";
import logo from "../assets/athenix-logo.jpeg";

const NAV_ITEMS = [
  { key: "analysis", label: "Video Analysis", icon: "🎥" },
  { key: "reports", label: "My Reports", icon: "📊" },
];

const SECTION_TITLES = {
  analysis: "Video Analysis",
  reports: "My Reports",
};

function AthleteDashboard() {
  const [activeSection, setActiveSection] = useState("analysis");
  // viewingReport = full report opened from history or just generated
  const [viewingReport, setViewingReport] = useState(null);
  const [file, setFile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("athenix_theme") || "light"
  );
  const { isAnalyzing, statusMessage, report, error, startAnalysis } = useVideoAnalysis();
  const navigate = useNavigate();
  const { name } = getSession();

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("athenix_theme", theme);
  }, [theme]);

  useEffect(() => {
    window.history.replaceState({ section: "analysis" }, "", window.location.pathname);
    const handlePopState = (e) => {
      if (e.state?.section) {
        setActiveSection(e.state.section);
        setViewingReport(null);
        window.history.pushState({ section: e.state.section }, "", window.location.pathname);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // When background analysis completes, update viewingReport
  useEffect(() => {
    if (report && !isAnalyzing) {
      setViewingReport(report);
    }
  }, [report, isAnalyzing]);

  const handleNavigate = useCallback((section) => {
    window.history.pushState({ section }, "", window.location.pathname);
    setActiveSection(section);
    if (section !== "reports") setViewingReport(null);
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const handleAnalyze = async () => {
    if (!file) { alert("Please select a video file first"); return; }
    let athleteId;
    try {
      const { getMyAthleteProfile } = await import("../api/auth");
      const p = await getMyAthleteProfile();
      athleteId = p.athlete_id;
    } catch { /* continue without linking */ }
    startAnalysis(file, athleteId);
  };

  const handleOpenReportFromHistory = (fullReport) => {
    setViewingReport(fullReport);
    handleNavigate("reports");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logo} alt="Athenix" />
          <span>ATHENIX</span>
        </div>
        <div className="sidebar-tagline">Athlete Portal</div>

        {NAV_ITEMS.map(item => (
          <div
            key={item.key}
            className={`nav-item ${activeSection === item.key ? "active" : ""}`}
            onClick={() => handleNavigate(item.key)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}

        {isAnalyzing && (
          <div style={{
            margin: "12px 16px", background: "rgba(56,189,248,0.1)",
            borderRadius: "8px", padding: "10px 12px", fontSize: "12px", color: "var(--blue-400)"
          }}>
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>⏳ Analysis in Progress</div>
            <div style={{ opacity: 0.8, lineHeight: 1.5 }}>{statusMessage}</div>
          </div>
        )}

        {report && !isAnalyzing && (
          <div
            style={{
              margin: "0 16px 12px", background: "rgba(22,199,132,0.1)",
              borderRadius: "8px", padding: "10px 12px",
              fontSize: "12px", color: "var(--risk-low)", cursor: "pointer"
            }}
            onClick={() => handleNavigate("reports")}
          >
            <div style={{ fontWeight: 600, marginBottom: "2px" }}>✅ Report Ready</div>
            <div style={{ opacity: 0.8 }}>Click to view →</div>
          </div>
        )}

        <div className="sidebar-footer">
          <button
            className="btn btn-ghost"
            style={{ width: "100%", color: "#93A3C2", borderColor: "rgba(255,255,255,0.15)" }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </aside>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="topbar">
          <h1 className="font-display">{SECTION_TITLES[activeSection]}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              className="theme-toggle"
              onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
            >
              {theme === "light" ? "🌙 Dark" : "☀️ Light"}
            </button>
            <ProfileDropdown
              name={name}
              onProfile={() => setShowProfile(true)}
              onSettings={() => setShowSettings(true)}
              onLogout={handleLogout}
            />
          </div>
        </div>

        <div className="main-content">
          {/* VIDEO ANALYSIS */}
          {activeSection === "analysis" && (
            <div className="card">
              <h2 className="font-display" style={{ fontSize: "16px", marginTop: 0, marginBottom: "6px" }}>
                Upload Your Training Video
              </h2>
              <p style={{ fontSize: "13px", color: "var(--slate-500)", marginTop: 0, marginBottom: "20px" }}>
                Upload a video to receive a full AI-powered sports injury risk assessment.
              </p>

              {isAnalyzing ? (
                <div style={{
                  padding: "20px", background: "rgba(11,95,255,0.04)",
                  borderRadius: "8px", border: "1px solid rgba(11,95,255,0.12)"
                }}>
                  <p className="font-mono" style={{ fontSize: "12px", color: "var(--blue-600)", margin: 0 }}>
                    ⏳ {statusMessage}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "8px 0 0" }}>
                    You can navigate to other sections — analysis continues in the background.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "440px" }}>
                  <label style={{
                    border: "1.5px dashed var(--slate-200)", borderRadius: "8px",
                    padding: "24px 20px", textAlign: "center", cursor: "pointer",
                    fontSize: "13px", color: "var(--slate-500)"
                  }}>
                    {file
                      ? <span style={{ color: "var(--blue-600)", fontWeight: 500 }}>{file.name}</span>
                      : "Click to choose a video (.mp4, .mov, .avi)"}
                    <input
                      type="file" accept="video/mp4,video/quicktime,video/x-msvideo"
                      onChange={e => setFile(e.target.files[0])} style={{ display: "none" }}
                    />
                  </label>
                  <button onClick={handleAnalyze} className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
                    Upload & Analyze
                  </button>
                  {error && <p style={{ color: "var(--risk-critical)", fontSize: "13px" }}>{error}</p>}
                </div>
              )}

              {report && !isAnalyzing && (
                <div style={{ marginTop: "20px" }}>
                  <p style={{ fontSize: "13px", color: "var(--risk-low)", fontWeight: 600, margin: "0 0 10px" }}>
                    ✅ Analysis complete — report saved to your history.
                  </p>
                  <button className="btn btn-primary" onClick={() => handleNavigate("reports")}>
                    View Full Report →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MY REPORTS */}
          {activeSection === "reports" && (
            viewingReport ? (
              <div>
                <button
                  className="btn btn-ghost"
                  style={{ marginBottom: "16px" }}
                  onClick={() => setViewingReport(null)}
                >
                  ← Back to Report History
                </button>
                <BiomechanicsReport report={viewingReport} />
              </div>
            ) : (
              <ReportHistory onOpenReport={handleOpenReportFromHistory} />
            )
          )}
        </div>
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default AthleteDashboard;