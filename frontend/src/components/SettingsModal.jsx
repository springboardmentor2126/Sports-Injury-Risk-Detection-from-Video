import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteMyAccount, clearSession } from "../api/auth";

const overlayStyle = {
  position: "fixed", inset: 0,
  background: "rgba(6, 11, 26, 0.6)",
  display: "flex", alignItems: "center",
  justifyContent: "center", zIndex: 300,
  backdropFilter: "blur(4px)"
};

const modalStyle = {
  background: "var(--white)",
  borderRadius: "var(--radius)",
  padding: "28px",
  width: "440px",
  boxShadow: "0 24px 64px rgba(0,0,0,0.25)"
};

function SettingsModal({ onClose }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteMyAccount();
      clearSession();
      navigate("/login", { replace: true });
    } catch (err) {
      alert("Failed to delete account: " + (err.response?.data?.detail || err.message));
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "24px"
        }}>
          <h2 className="font-display" style={{ fontSize: "18px", margin: 0 }}>Settings</h2>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "20px", color: "var(--slate-500)", lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        <div style={{
          borderTop: "1px solid var(--slate-200)",
          paddingTop: "20px"
        }}>
          <h3 style={{
            fontSize: "14px", fontWeight: 600,
            color: "var(--risk-critical)", margin: "0 0 8px"
          }}>
            Danger Zone
          </h3>
          <p style={{ fontSize: "13px", color: "var(--slate-500)", margin: "0 0 16px" }}>
            Permanently deletes your account and all associated data. This action cannot be undone.
          </p>

          {!confirming ? (
            <button
              className="btn btn-ghost"
              style={{ color: "var(--risk-critical)", borderColor: "var(--risk-critical)" }}
              onClick={() => setConfirming(true)}
            >
              Delete My Account
            </button>
          ) : (
            <div style={{
              padding: "16px",
              background: "rgba(239,68,68,0.05)",
              borderRadius: "8px",
              border: "1px solid rgba(239,68,68,0.2)"
            }}>
              <p style={{
                fontSize: "13px", fontWeight: 600,
                color: "var(--risk-critical)", margin: "0 0 14px"
              }}>
                Are you absolutely sure? Your profile, videos, and reports will be permanently removed.
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="btn"
                  style={{ background: "var(--risk-critical)", color: "#fff" }}
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? "Deleting…" : "Yes, Delete My Account"}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setConfirming(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;