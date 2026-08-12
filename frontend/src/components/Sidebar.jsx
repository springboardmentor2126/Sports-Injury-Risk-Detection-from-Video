import logo from "../assets/athenix-logo.jpeg";

function Sidebar({ activeSection, onNavigate, onLogout }) {
  const items = [
    { key: "athletes", label: "Athlete Management", icon: "👤" },
    { key: "analyze", label: "Video Analysis", icon: "🎥" },
    { key: "reports", label: "Reports", icon: "📊" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src={logo} alt="Athenix" />
        <span>ATHENIX</span>
      </div>

      <div className="sidebar-tagline">
        Powering every move with intelligence
      </div>

      {items.map((item) => (
        <div
          key={item.key}
          className={`nav-item ${activeSection === item.key ? "active" : ""}`}
          onClick={() => onNavigate(item.key)}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}

      <div className="sidebar-footer">
        <button
          className="btn btn-ghost"
          style={{
            width: "100%",
            color: "#93A3C2",
            borderColor: "rgba(255,255,255,0.15)",
          }}
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;