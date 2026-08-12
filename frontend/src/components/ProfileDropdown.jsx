import { useState, useRef, useEffect } from "react";

const dropItemStyle = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "10px 16px",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "13px",
  color: "var(--slate-700)",
  fontFamily: "var(--font-body)",
  transition: "background 0.15s ease"
};

function ProfileDropdown({ name, onProfile, onSettings, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "rgba(11,95,255,0.08)",
          border: "1px solid rgba(11,95,255,0.15)",
          borderRadius: "20px",
          padding: "6px 14px",
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          color: "var(--blue-600)",
          fontWeight: 600,
          transition: "all 0.2s ease"
        }}
      >
        👤 {name} ▼
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            background: "var(--white)",
            border: "1px solid var(--slate-200)",
            borderRadius: "10px",
            boxShadow: "var(--shadow-hover)",
            minWidth: "190px",
            zIndex: 200,
            overflow: "hidden"
          }}
        >
          <button
            style={dropItemStyle}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--ice-50)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
            onClick={() => { setOpen(false); onProfile(); }}
          >
            👤&nbsp;&nbsp;My Profile
          </button>
          <button
            style={dropItemStyle}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--ice-50)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
            onClick={() => { setOpen(false); onSettings(); }}
          >
            ⚙️&nbsp;&nbsp;Settings
          </button>
          <div style={{ borderTop: "1px solid var(--slate-200)", margin: "4px 0" }} />
          <button
            style={{ ...dropItemStyle, color: "var(--risk-critical)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.05)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
            onClick={() => { setOpen(false); onLogout(); }}
          >
            🚪&nbsp;&nbsp;Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfileDropdown;