import { useState, useEffect } from "react";
import { getMyAthleteProfile, updateMyAthleteProfile, getSession } from "../api/auth";

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
  width: "540px",
  maxHeight: "85vh",
  overflowY: "auto",
  boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
  position: "relative"
};

function Row({ label, value }) {
  return (
    <tr>
      <td style={{ padding: "10px 8px", fontWeight: 500, color: "var(--slate-500)", fontSize: "13px", width: "45%" }}>
        {label}
      </td>
      <td style={{ padding: "10px 8px", fontSize: "14px", color: "var(--slate-700)" }}>
        {value != null && value !== "" ? String(value) : "—"}
      </td>
    </tr>
  );
}

function ProfileModal({ onClose }) {
  const session = getSession();

const [name, setName] = useState(session.name || "");
const [email, setEmail] = useState(session.email || "");
const [role] = useState(session.role || "");
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
  const token = localStorage.getItem("access_token");

  if (token) {
    fetch("http://127.0.0.1:8000/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;

        if (data.email) {
          setEmail(data.email);
          localStorage.setItem("user_email", data.email);
        }

        if (data.full_name) {
          setName(data.full_name);
          localStorage.setItem("user_name", data.full_name);
        }
      })
      .catch(() => {});
  }

  if (role === "Athlete") {
    fetchProfile();
  }
}, [role]);

  const fetchProfile = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const data = await getMyAthleteProfile();
      setProfile(data);
      setEditForm({ ...data });
    } catch (err) {
  if (err.response?.status === 404) {
    setFetchError(
      "Athlete profile not found. If you just completed profile setup, please log out and log back in once."
    );
  } else {
    setFetchError("Could not load profile. Please try again.");
  }
} finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        ...editForm,
        age: editForm.age ? parseInt(editForm.age) : null,
        height: editForm.height ? parseFloat(editForm.height) : null,
        weight: editForm.weight ? parseFloat(editForm.weight) : null
      };
      const updated = await updateMyAthleteProfile(payload);
      setProfile(updated);
      setEditForm({ ...updated });
      setEditMode(false);
    } catch (err) {
      setSaveError(
        err.response?.data?.detail || "Failed to save. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const editableFields = [
    ["sport_type", "Sport Type"],
    ["position", "Position"],
    ["age", "Age"],
    ["height", "Height (cm)"],
    ["weight", "Weight (kg)"],
    ["training_load", "Training Load"],
    ["injury_history", "Previous Injury History"]
  ];

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "20px"
        }}>
          <h2 className="font-display" style={{ fontSize: "18px", margin: 0 }}>My Profile</h2>
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

        {/* Account info — always shown */}
        <div style={{
          background: "var(--ice-50)", borderRadius: "8px",
          padding: "14px 16px", marginBottom: "20px",
          border: "1px solid var(--slate-200)"
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <Row label="Full Name" value={name} />
              <Row label="Email" value={email} />
              <Row label="Role" value={role} />
            </tbody>
          </table>
        </div>

        {/* Athlete profile section */}
        {role === "Athlete" && (
          <>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: "12px"
            }}>
              <h3 className="font-display" style={{ fontSize: "15px", margin: 0 }}>
                Athlete Profile
              </h3>
              {!loading && profile && !editMode && (
                <button className="btn btn-primary" style={{ padding: "6px 16px", fontSize: "13px" }}
                  onClick={() => setEditMode(true)}>
                  Edit Profile
                </button>
              )}
            </div>

            {loading && (
              <p style={{ color: "var(--slate-500)", fontSize: "14px" }}>Loading profile…</p>
            )}

            {fetchError && (
              <p style={{ color: "var(--risk-critical)", fontSize: "13px" }}>{fetchError}</p>
            )}

            {!loading && !fetchError && profile && !editMode && (
              <table style={{ width: "100%", borderCollapse: "collapse" }} className="data-table">
                <tbody>
                  <Row label="Athlete ID" value={profile.athlete_id} />
                  <Row label="Sport Type" value={profile.sport_type} />
                  <Row label="Position" value={profile.position} />
                  <Row label="Age" value={profile.age} />
                  <Row label="Height" value={profile.height ? `${profile.height} cm` : null} />
                  <Row label="Weight" value={profile.weight ? `${profile.weight} kg` : null} />
                  <Row label="Training Load" value={profile.training_load} />
                  <Row label="Previous Injury History" value={profile.injury_history} />
                </tbody>
              </table>
            )}

            {!loading && !fetchError && profile && editMode && (
              <>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr",
                  gap: "12px", marginBottom: "16px"
                }}>
                  {editableFields.map(([field, label]) => (
                    <input
                      key={field}
                      className="input"
                      placeholder={label}
                      value={editForm[field] || ""}
                      onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                      style={field === "injury_history" ? { gridColumn: "1 / -1" } : {}}
                    />
                  ))}
                </div>
                {saveError && (
                  <p style={{ color: "var(--risk-critical)", fontSize: "13px", marginBottom: "12px" }}>
                    {saveError}
                  </p>
                )}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => { setEditMode(false); setEditForm({ ...profile }); setSaveError(""); }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {role === "Coach" && (
          <p style={{ fontSize: "13px", color: "var(--slate-500)", margin: 0 }}>
            Manage athletes through the Athlete Management section.
          </p>
        )}
      </div>
    </div>
  );
}

export default ProfileModal;