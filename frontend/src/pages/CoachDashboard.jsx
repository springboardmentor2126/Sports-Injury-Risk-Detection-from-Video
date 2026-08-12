import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { clearSession, getSession } from "../api/auth";
import { useVideoAnalysis } from "../contexts/VideoAnalysisContext";
import BiomechanicsReport from "../components/BiomechanicsReport";
import ReportHistory from "../components/ReportHistory";
import ProfileDropdown from "../components/ProfileDropdown";
import ProfileModal from "../components/ProfileModal";
import SettingsModal from "../components/SettingsModal";
import logo from "../assets/athenix-logo.jpeg";

function generateAthleteId() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `ATH-${d}-${Math.floor(1000 + Math.random() * 9000)}`;
}

const emptyForm = {
  athlete_id: "", name: "", sport_type: "", position: "",
  age: "", height: "", weight: "", injury_history: "", training_load: ""
};

const NAV_ITEMS = [
  { key: "athletes", label: "Athlete Management", icon: "👥" },
  { key: "analysis", label: "Video Analysis", icon: "🎥" },
  { key: "reports", label: "Reports", icon: "📊" }
];

const SECTION_TITLES = {
  athletes: "Athlete Management",
  analysis: "Video Analysis",
  reports: "Reports"
};

function CoachDashboard() {
  const [activeSection, setActiveSection] = useState("athletes");
  const [athletes, setAthletes] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [editingAthlete, setEditingAthlete] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [addForm, setAddForm] = useState({ ...emptyForm, athlete_id: generateAthleteId() });
  const [showAddForm, setShowAddForm] = useState(false);
  const [file, setFile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [viewingReport, setViewingReport] = useState(null);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("athenix_theme") || "light"
  );

  const { isAnalyzing, statusMessage, report, error, startAnalysis } = useVideoAnalysis();
  const navigate = useNavigate();
  const { name } = getSession();

  // ── Theme ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("athenix_theme", theme);
  }, [theme]);

  // ── Browser back button ────────────────────────────────────────────────────
  useEffect(() => {
    window.history.replaceState({ section: "athletes" }, "", window.location.pathname);

    const handlePopState = (e) => {
      if (e.state?.section) {
        setActiveSection(e.state.section);
        window.history.pushState({ section: e.state.section }, "", window.location.pathname);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleNavigate = useCallback((section) => {
    window.history.pushState({ section }, "", window.location.pathname);
    setActiveSection(section);
  }, []);

  // ── Data ───────────────────────────────────────────────────────────────────
  useEffect(() => { loadAthletes(); }, []);

  const loadAthletes = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/athletes/");
      setAthletes(res.data);
    } catch (err) { console.error("Failed to load athletes:", err); }
  };

  // ── Auth ───────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  // ── Athlete CRUD ───────────────────────────────────────────────────────────
  const handleAddAthlete = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://127.0.0.1:8000/athletes/", addForm);
      setAddForm({ ...emptyForm, athlete_id: generateAthleteId() });
      setShowAddForm(false);
      loadAthletes();
    } catch (err) {
      alert("Failed to add athlete: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleSaveAthlete = async () => {
    try {
      await axios.put(`http://127.0.0.1:8000/athletes/${editingAthlete.athlete_id}`, editForm);
      setEditingAthlete(null);
      loadAthletes();
    } catch (err) {
      alert("Failed to update: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteAthlete = async (athleteId) => {
    if (!window.confirm(`Permanently delete athlete ${athleteId}?`)) return;
    try {
      await axios.delete(`http://127.0.0.1:8000/athletes/${athleteId}`);
      if (selectedAthlete?.athlete_id === athleteId) setSelectedAthlete(null);
      loadAthletes();
    } catch (err) {
      alert("Failed to delete: " + (err.response?.data?.detail || err.message));
    }
  };

  const selectAndAnalyze = (athlete) => {
    setSelectedAthlete(athlete);
    handleNavigate("analysis");
  };

  // ── Analysis ───────────────────────────────────────────────────────────────
  const handleAnalyze = () => {
    if (!file) { alert("Please select a video file first"); return; }
    if (!selectedAthlete) { alert("Please select an athlete first"); return; }
    startAnalysis(file, selectedAthlete.athlete_id);
  };

  const filteredAthletes = athletes.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.athlete_id.toLowerCase().includes(search.toLowerCase()) ||
    (a.sport_type || "").toLowerCase().includes(search.toLowerCase())
  );

  const formFields = [
    ["name", "Full Name", true],
    ["sport_type", "Sport Type", false],
    ["position", "Position", false],
    ["age", "Age", false],
    ["height", "Height (cm)", false],
    ["weight", "Weight (kg)", false],
    ["injury_history", "Injury History", false],
    ["training_load", "Training Load", false]
  ];

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logo} alt="Athenix" />
          <span>ATHENIX</span>
        </div>
        <div className="sidebar-tagline">Coach Portal</div>

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
            borderRadius: "8px", padding: "10px 12px",
            fontSize: "12px", color: "var(--blue-400)"
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
            onClick={() => {
  setViewingReport(report);
  handleNavigate("reports");
}}
          >
            <div style={{ fontWeight: 600, marginBottom: "2px" }}>✅ Report Ready</div>
            <div style={{ opacity: 0.8 }}>Click to view →</div>
          </div>
        )}

        {selectedAthlete && (
          <div style={{
            margin: "0 16px 12px", background: "rgba(22,199,132,0.08)",
            borderRadius: "8px", padding: "10px 12px",
            border: "1px solid rgba(22,199,132,0.2)", fontSize: "12px"
          }}>
            <div style={{ color: "var(--risk-low)", fontWeight: 600, marginBottom: "2px" }}>
              Selected Athlete
            </div>
            <div style={{ color: "var(--slate-700)" }}>{selectedAthlete.name}</div>
            <div style={{ fontFamily: "var(--font-mono)", opacity: 0.7, fontSize: "11px" }}>
              {selectedAthlete.athlete_id}
            </div>
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

      {/* ── Main ── */}
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
          {/* ATHLETE MANAGEMENT */}
          {activeSection === "athletes" && (
            <>
              <div className="card" style={{ marginBottom: "20px" }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: "16px", gap: "12px",
                  flexWrap: "wrap"
                }}>
                  <h2 className="font-display" style={{ fontSize: "16px", margin: 0 }}>
                    All Athletes
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: "12px",
                      color: "var(--slate-500)", marginLeft: "10px"
                    }}>
                      {filteredAthletes.length} found
                    </span>
                  </h2>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input
                      className="input"
                      placeholder="Search by name, ID, or sport…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{ width: "240px" }}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={() => { setShowAddForm(!showAddForm); setEditingAthlete(null); }}
                    >
                      {showAddForm ? "Cancel" : "+ Add Athlete"}
                    </button>
                  </div>
                </div>

                {filteredAthletes.length === 0 ? (
                  <p style={{ color: "var(--slate-500)", fontSize: "14px", margin: 0 }}>
                    No athletes found.
                  </p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Athlete ID</th>
                          <th>Name</th>
                          <th>Sport</th>
                          <th>Age</th>
                          <th>Training Load</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAthletes.map(a => (
                          <tr key={a.id}
                            style={selectedAthlete?.athlete_id === a.athlete_id
                              ? { background: "rgba(22,199,132,0.05)" }
                              : {}}>
                            <td className="font-mono" style={{ fontSize: "12px" }}>{a.athlete_id}</td>
                            <td>{a.name}</td>
                            <td>{a.sport_type || "—"}</td>
                            <td>{a.age || "—"}</td>
                            <td>{a.training_load || "—"}</td>
                            <td>
                              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                <button
                                  className="btn btn-ghost"
                                  style={{ padding: "4px 10px", fontSize: "12px", color: "var(--blue-600)" }}
                                  onClick={() => selectAndAnalyze(a)}
                                >
                                  Analyze
                                </button>
                                <button
                                  className="btn btn-ghost"
                                  style={{ padding: "4px 10px", fontSize: "12px" }}
                                  onClick={() => {
                                    setEditingAthlete(a);
                                    setEditForm({ ...a });
                                    setShowAddForm(false);
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-ghost"
                                  style={{
                                    padding: "4px 10px", fontSize: "12px",
                                    color: "var(--risk-critical)",
                                    borderColor: "var(--risk-critical)"
                                  }}
                                  onClick={() => handleDeleteAthlete(a.athlete_id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Add Athlete Form */}
              {showAddForm && (
                <div className="card" style={{ marginBottom: "20px" }}>
                  <h2 className="font-display" style={{ fontSize: "16px", marginTop: 0, marginBottom: "16px" }}>
                    Add New Athlete
                  </h2>
                  <form onSubmit={handleAddAthlete}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
                      <div style={{ position: "relative" }}>
                        <input
                          className="input"
                          placeholder="Athlete ID"
                          value={addForm.athlete_id}
                          onChange={e => setAddForm(f => ({ ...f, athlete_id: e.target.value }))}
                          required
                          style={{ fontFamily: "var(--font-mono)", paddingRight: "50px" }}
                        />
                        <button
                          type="button"
                          onClick={() => setAddForm(f => ({ ...f, athlete_id: generateAthleteId() }))}
                          style={{
                            position: "absolute", right: "8px", top: "50%",
                            transform: "translateY(-50%)", background: "none",
                            border: "none", cursor: "pointer",
                            fontSize: "11px", color: "var(--blue-600)", fontWeight: 600
                          }}
                        >
                          New
                        </button>
                      </div>
                      {formFields.map(([field, label, req]) => (
                        <input
                          key={field}
                          className="input"
                          placeholder={label}
                          required={req}
                          value={addForm[field] || ""}
                          onChange={e => setAddForm(f => ({ ...f, [field]: e.target.value }))}
                        />
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                      <button type="submit" className="btn btn-primary">Add Athlete</button>
                      <button type="button" className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Edit Athlete Form */}
              {editingAthlete && (
                <div className="card">
                  <h2 className="font-display" style={{ fontSize: "16px", marginTop: 0, marginBottom: "16px" }}>
                    Edit — {editingAthlete.name}
                  </h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
                    {formFields.map(([field, label]) => (
                      <input
                        key={field}
                        className="input"
                        placeholder={label}
                        value={editForm[field] || ""}
                        onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                    <button className="btn btn-primary" onClick={handleSaveAthlete}>Save Changes</button>
                    <button className="btn btn-ghost" onClick={() => setEditingAthlete(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* VIDEO ANALYSIS */}
          {activeSection === "analysis" && (
            <div className="card">
              <h2 className="font-display" style={{ fontSize: "16px", marginTop: 0, marginBottom: "6px" }}>
                Analyze Athlete Video
              </h2>
              <p style={{ fontSize: "13px", color: "var(--slate-500)", marginTop: 0, marginBottom: "20px" }}>
                Select an athlete from Athlete Management, then upload their video here.
              </p>

              {!selectedAthlete ? (
                <div style={{
                  padding: "20px",
                  background: "rgba(245,158,11,0.05)",
                  borderRadius: "8px",
                  border: "1px solid rgba(245,158,11,0.2)"
                }}>
                  <p style={{ margin: 0, fontSize: "14px", color: "var(--risk-moderate)" }}>
                    ⚠️ No athlete selected. Go to <strong>Athlete Management</strong> and click{" "}
                    <strong>Analyze</strong> next to an athlete.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{
                    marginBottom: "20px", padding: "12px 16px",
                    background: "rgba(22,199,132,0.06)", borderRadius: "8px",
                    border: "1px solid rgba(22,199,132,0.2)",
                    display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap"
                  }}>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>Analyzing for:</span>
                    <span className="font-mono" style={{ fontSize: "13px" }}>
                      {selectedAthlete.name} ({selectedAthlete.athlete_id})
                    </span>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: "3px 10px", fontSize: "12px" }}
                      onClick={() => setSelectedAthlete(null)}
                    >
                      Change
                    </button>
                  </div>

                  {isAnalyzing ? (
                    <div style={{
                      padding: "20px", background: "rgba(11,95,255,0.04)",
                      borderRadius: "8px", border: "1px solid rgba(11,95,255,0.12)"
                    }}>
                      <p className="font-mono" style={{ fontSize: "12px", color: "var(--blue-600)", margin: 0 }}>
                        ⏳ {statusMessage}
                      </p>
                      <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "8px 0 0" }}>
                        You can navigate to Athlete Management. Analysis continues in the background.
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
                          type="file"
                          accept="video/mp4,video/quicktime,video/x-msvideo"
                          onChange={e => setFile(e.target.files[0])}
                          style={{ display: "none" }}
                        />
                      </label>
                      <button onClick={handleAnalyze} className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
                        Upload & Analyze
                      </button>
                      {error && <p style={{ color: "var(--risk-critical)", fontSize: "13px" }}>{error}</p>}
                    </div>
                  )}

                  {report && !isAnalyzing && (
                    <div style={{ marginTop: "16px" }}>
                      <p style={{ fontSize: "13px", color: "var(--risk-low)", fontWeight: 600, margin: "0 0 10px" }}>
                        ✅ {statusMessage}
                      </p>
                      <button
    className="btn btn-primary"
    onClick={() => {
        setViewingReport(report);
        handleNavigate("reports");
    }}
>
    View Full Report →
</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* REPORTS */}
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
    <ReportHistory
      onOpenReport={(savedReport) => {
        setViewingReport(savedReport);
      }}
    />
  )
)}
        </div>
      </div>

      {/* ── Modals ── */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default CoachDashboard;