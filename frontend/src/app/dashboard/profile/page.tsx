"use client";
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { athleteApi, authApi, AthleteProfileInput, InjuryInput, removeToken } from "@/lib/api";

// ─── Sports & Positions ───────────────────────────────────────────
const SPORTS: { label: string; value: string }[] = [
  { label: "Basketball", value: "BASKETBALL" },
  { label: "Soccer", value: "SOCCER" },
  { label: "Tennis", value: "TENNIS" },
  { label: "Baseball", value: "BASEBALL" },
  { label: "American Football", value: "AMERICAN_FOOTBALL" },
  { label: "Volleyball", value: "VOLLEYBALL" },
  { label: "Track & Field", value: "TRACK" },
  { label: "Swimming", value: "SWIMMING" },
  { label: "Boxing", value: "BOXING" },
  { label: "Wrestling", value: "WRESTLING" },
  { label: "Rugby", value: "RUGBY" },
  { label: "Hockey", value: "HOCKEY" },
  { label: "Badminton", value: "BADMINTON" },
  { label: "Gymnastics", value: "GYMNASTICS" },
  { label: "Cycling", value: "CYCLING" },
  { label: "Cricket", value: "CRICKET" },
  { label: "Other", value: "OTHER" },
];

const POSITIONS: Record<string, string[]> = {
  BASKETBALL: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
  SOCCER: ["Goalkeeper", "Centre-Back", "Full-Back", "Wing-Back", "Defensive Midfielder", "Central Midfielder", "Attacking Midfielder", "Winger", "Striker", "Forward"],
  TENNIS: ["Singles Player", "Doubles Player", "Mixed Doubles"],
  BASEBALL: ["Pitcher", "Catcher", "First Base", "Second Base", "Third Base", "Shortstop", "Left Field", "Center Field", "Right Field", "Designated Hitter"],
  AMERICAN_FOOTBALL: ["Quarterback", "Running Back", "Wide Receiver", "Tight End", "Offensive Lineman", "Defensive Lineman", "Linebacker", "Cornerback", "Safety", "Kicker", "Punter"],
  VOLLEYBALL: ["Setter", "Outside Hitter", "Opposite Hitter", "Middle Blocker", "Libero", "Defensive Specialist"],
  TRACK: ["Sprinter", "Middle Distance", "Long Distance", "Hurdler", "High Jumper", "Long Jumper", "Triple Jumper", "Pole Vaulter", "Shot Put", "Discus", "Javelin", "Decathlete"],
  SWIMMING: ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "Individual Medley", "Open Water"],
  BOXING: ["Lightweight", "Welterweight", "Middleweight", "Light Heavyweight", "Heavyweight", "Featherweight", "Bantamweight"],
  WRESTLING: ["Freestyle", "Greco-Roman", "Folkstyle"],
  RUGBY: ["Prop", "Hooker", "Lock", "Flanker", "Number 8", "Scrum-Half", "Fly-Half", "Centre", "Wing", "Full-Back"],
  HOCKEY: ["Goalkeeper", "Defender", "Midfielder", "Forward", "Centre"],
  BADMINTON: ["Singles Player", "Doubles Player", "Mixed Doubles"],
  GYMNASTICS: ["Artistic", "Rhythmic", "Trampoline", "Acrobatic", "Aerobic"],
  CYCLING: ["Road Cyclist", "Track Cyclist", "Mountain Biker", "BMX Rider", "Time Trialist", "Climber", "Sprinter"],
  CRICKET: ["Batsman", "Bowler", "All-Rounder", "Wicket-Keeper", "Opening Batsman", "Fast Bowler", "Spin Bowler"],
  OTHER: [],
};

const GENDERS: { label: string; value: string }[] = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other / Prefer not to say", value: "OTHER" },
];

// ─── Injury dropdowns — values match backend Enum exactly ─────────
const INJURY_NAMES: { label: string; value: string }[] = [
  { label: "ACL Tear", value: "ACL_TEAR" },
  { label: "MCL Tear", value: "MCL_TEAR" },
  { label: "Meniscus Tear", value: "MENISCUS_TEAR" },
  { label: "Ankle Sprain", value: "ANKLE_SPRAIN" },
  { label: "Hamstring Strain", value: "HAMSTRING_STRAIN" },
  { label: "Groin Pull", value: "GROIN_PULL" },
  { label: "Shin Splints", value: "SHIN_SPLINTS" },
  { label: "Tennis Elbow", value: "TENNIS_ELBOW" },
  { label: "Concussion", value: "CONCUSSION" },
  { label: "Shoulder Dislocation", value: "SHOULDER_DISLOCATION" },
  { label: "Rotator Cuff Tear", value: "ROTATOR_CUFF_TEAR" },
  { label: "Fracture", value: "FRACTURE" },
  { label: "Tendinitis", value: "TENDINITIS" },
  { label: "Other", value: "OTHER" },
];

const BODY_PARTS: { label: string; value: string }[] = [
  { label: "Left Knee", value: "LEFT_KNEE" },
  { label: "Right Knee", value: "RIGHT_KNEE" },
  { label: "Left Ankle", value: "LEFT_ANKLE" },
  { label: "Right Ankle", value: "RIGHT_ANKLE" },
  { label: "Left Shoulder", value: "LEFT_SHOULDER" },
  { label: "Right Shoulder", value: "RIGHT_SHOULDER" },
  { label: "Left Hip", value: "LEFT_HIP" },
  { label: "Right Hip", value: "RIGHT_HIP" },
  { label: "Lower Back", value: "LOWER_BACK" },
  { label: "Upper Back", value: "UPPER_BACK" },
  { label: "Neck", value: "NECK" },
  { label: "Left Elbow", value: "LEFT_ELBOW" },
  { label: "Right Elbow", value: "RIGHT_ELBOW" },
  { label: "Left Wrist", value: "LEFT_WRIST" },
  { label: "Right Wrist", value: "RIGHT_WRIST" },
  { label: "Other", value: "OTHER" },
];

// Helper: convert stored enum value → human-readable label for display
function toLabel(list: { label: string; value: string }[], value: string): string {
  return list.find(item => item.value === value)?.label ?? value;
}

// ─── Field wrapper ────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="sg-label">{label}</label>
      {children}
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();

  // ── ALL hooks must be declared before any conditional return ──

  // Role + account
  const [role, setRole]               = useState<string | null>(null);
  const [userInfo, setUserInfo]       = useState<{ first_name: string; last_name: string; email: string; role: { name: string }; invite_code?: string | null } | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirm, setDeleteConfirm]     = useState(false);

  // Athlete profile form
  const [profile, setProfile] = useState<AthleteProfileInput>({
    sport_type: "", position: "", age: 0, height_cm: 0,
    weight_kg: 0, weekly_training_hours: 0, gender: "", dominant_limb: "RIGHT",
  });
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState({ type: "", text: "" });

  // Injury history
  const [injury, setInjury] = useState<InjuryInput>({
    injury_name: "", affected_body_part: "", injury_date: "",
    recovery_duration_weeks: undefined, notes: "",
  });
  const [injuries, setInjuries] = useState<Array<{
    id: string; injury_name: string; affected_body_part: string;
    injury_date: string; recovery_duration_weeks: number | null; notes: string | null;
  }>>([]);
  const [showInjuryForm, setShowInjuryForm] = useState(false);
  const [addingInjury, setAddingInjury]     = useState(false);
  const [injuryMsg, setInjuryMsg]           = useState({ type: "", text: "" });

  // Linking
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkMsg, setLinkMsg] = useState({ type: "", text: "" });

  // ── Fetch user role on mount ──
  useEffect(() => {
    authApi.getMe().then(u => {
      setRole(u.role?.name ?? "athlete");
      setUserInfo(u);
    }).catch(() => {});
  }, []);

  // ── Athlete-only data loading ──
  useEffect(() => {
    if (role !== "athlete") return;
    athleteApi.getProfile()
      .then(d => {
        setProfile({
          sport_type: (d.sport_type || "").toUpperCase().replace(/ /g, "_"),
          position: d.position || "",
          age: d.age,
          height_cm: Number(d.height_cm),
          weight_kg: Number(d.weight_kg),
          weekly_training_hours: d.weekly_training_hours,
          gender: (d.gender || "").toUpperCase() || "",
          dominant_limb: (d.dominant_limb || "RIGHT").toUpperCase(),
        });
        setHasProfile(true);
      })
      .catch(() => setHasProfile(false))
      .finally(() => setLoading(false));

    athleteApi.getInjuries().then(setInjuries).catch(() => {});
  }, [role]);


  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      if (hasProfile) await athleteApi.updateProfile(profile);
      else { await athleteApi.createProfile(profile); setHasProfile(true); }
      setMsg({ type: "success", text: "Profile saved successfully." });
    } catch (err: unknown) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to save." });
    } finally { setSaving(false); }
  }

  async function handleAddInjury(e: FormEvent) {
    e.preventDefault();
    setAddingInjury(true);
    setInjuryMsg({ type: "", text: "" });
    try {
      const rec = await athleteApi.addInjury(injury);
      setInjuries(prev => [rec as typeof injuries[0], ...prev]);
      setInjury({ injury_name: "", affected_body_part: "", injury_date: "", recovery_duration_weeks: undefined, notes: "" });
      setShowInjuryForm(false);
      setInjuryMsg({ type: "success", text: "Injury record added." });
    } catch (err: unknown) {
      setInjuryMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to add injury." });
    } finally { setAddingInjury(false); }
  }

  async function handleLink(e: FormEvent) {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    setLinking(true);
    setLinkMsg({ type: "", text: "" });
    try {
      const res = await athleteApi.linkProfessional(inviteCodeInput.trim());
      setLinkMsg({ type: "success", text: res.message });
      setInviteCodeInput("");
    } catch (err: unknown) {
      setLinkMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to link professional." });
    } finally {
      setLinking(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirm("Are you sure you want to completely delete your account? This will permanently remove your profile, all video analyses, and saved skeleton tracking data. This action cannot be undone.")) return;
    
    setMsg({ type: "", text: "" });
    try {
      await authApi.deleteAccount();
      removeToken();
      router.push("/login");
    } catch (err: unknown) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to delete account." });
    }
  }

  // Non-athlete roles: simple account settings page
  if (role !== null && role !== "athlete") {
    const roleLabel: Record<string, string> = {
      coach: "Coach", physiotherapist: "Physiotherapist", scientist: "Sports Scientist", admin: "Admin",
    };
    
    const handleDeleteAccountNonAthlete = async () => {
      if (!deleteConfirm) { setDeleteConfirm(true); return; }
      setDeletingAccount(true);
      try {
        await authApi.deleteAccount();
        localStorage.removeItem("sg_last_analysis");
        removeToken();
        router.push("/login");
      } catch {
        setDeletingAccount(false);
        setDeleteConfirm(false);
      }
    };

    return (
      <div style={{ maxWidth: "560px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>Account Settings</h1>
        <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "28px" }}>Manage your SportGuard account</p>

        <div className="sg-card" style={{ marginBottom: "16px" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px" }}>Your Account</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>First name</p>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>{userInfo?.first_name ?? "--"}</p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Last name</p>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>{userInfo?.last_name ?? "--"}</p>
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Email address</p>
            <p style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>{userInfo?.email ?? "--"}</p>
          </div>
          <div>
            <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Role</p>
            <span className="sg-badge sg-badge-blue">{roleLabel[role] ?? role}</span>
          </div>
        </div>
        
        {(role === "coach" || role === "physiotherapist") && userInfo?.invite_code && (
          <div style={{ marginTop: "24px", marginBottom: "24px", padding: "16px", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>Your Invite Code</p>
            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>Athletes can enter this code on their profile to link to your account.</p>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <code style={{ background: "#fff", padding: "8px 16px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "18px", fontWeight: 700, color: "#2563eb", letterSpacing: "2px" }}>
                {userInfo.invite_code}
              </code>
            </div>
          </div>
        )}

        <div className="sg-card" style={{ border: "1px solid #fecaca", background: "#fff5f5" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#b91c1c", marginBottom: "6px" }}>Danger Zone</p>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "14px" }}>Permanently delete your account and all associated data. This cannot be undone.</p>
          {deleteConfirm ? (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <p style={{ fontSize: "13px", color: "#b91c1c", fontWeight: 600, marginRight: "4px" }}>Are you sure? This is permanent.</p>
              <button onClick={handleDeleteAccountNonAthlete} disabled={deletingAccount}
                style={{ padding: "8px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: "7px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "13px" }}>
                {deletingAccount ? "Deleting..." : "Yes, Delete My Account"}
              </button>
              <button onClick={() => setDeleteConfirm(false)}
                style={{ padding: "8px 16px", background: "transparent", border: "1px solid #e2e8f0", borderRadius: "7px", cursor: "pointer", fontFamily: "inherit", fontSize: "13px", color: "#64748b" }}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setDeleteConfirm(true)}
              style={{ padding: "9px 18px", background: "transparent", border: "1px solid #fca5a5", borderRadius: "7px", color: "#b91c1c", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: "13px" }}>
              Delete My Account
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div className="sg-spinner" style={{ width: "24px", height: "24px", border: "2px solid #e2e8f0", borderTopColor: "#2563eb" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "700px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
          Athlete Profile
        </h1>
        <p style={{ color: "#64748b", fontSize: "14px" }}>
          {hasProfile
            ? "Keep your profile up to date for accurate injury risk analysis."
            : "Fill in your details to get started with personalised analysis."}
        </p>
      </div>

      {/* ── Profile form ── */}
      <div className="sg-card" style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "20px" }}>
          Sports & Physical Information
        </h2>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {msg.text && <div className={`sg-alert ${msg.type === "success" ? "sg-alert-success" : "sg-alert-error"}`}>{msg.text}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <Field label="Sport">
              <select
                className="sg-input"
                value={profile.sport_type}
                onChange={e => setProfile(p => ({ ...p, sport_type: e.target.value, position: "" }))}
                required
              >
                <option value="">Select sport...</option>
                {SPORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Position / Speciality">
              {profile.sport_type && POSITIONS[profile.sport_type]?.length > 0 ? (
                <select
                  className="sg-input"
                  value={profile.position}
                  onChange={e => setProfile(p => ({ ...p, position: e.target.value }))}
                >
                  <option value="">Select position...</option>
                  {POSITIONS[profile.sport_type].map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="sg-input"
                  placeholder={profile.sport_type ? "No specific positions" : "Select a sport first"}
                  value={profile.position}
                  onChange={e => setProfile(p => ({ ...p, position: e.target.value }))}
                  disabled={!profile.sport_type}
                />
              )}
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <Field label="Age">
              <input type="number" className="sg-input" min={10} max={100} value={profile.age || ""} onChange={e => setProfile(p => ({ ...p, age: Number(e.target.value) }))} required />
            </Field>
            <Field label="Gender">
              <select className="sg-input" value={profile.gender} onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))}>
                <option value="">Prefer not to say</option>
                {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <Field label="Height (cm)">
              <input type="number" className="sg-input" min={100} max={250} step={0.1} placeholder="e.g. 185" value={profile.height_cm || ""} onChange={e => setProfile(p => ({ ...p, height_cm: Number(e.target.value) }))} required />
            </Field>
            <Field label="Weight (kg)">
              <input type="number" className="sg-input" min={30} max={200} step={0.1} placeholder="e.g. 78" value={profile.weight_kg || ""} onChange={e => setProfile(p => ({ ...p, weight_kg: Number(e.target.value) }))} required />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <Field label="Weekly Training Hours">
              <input type="number" className="sg-input" min={0} max={168} value={profile.weekly_training_hours || ""} onChange={e => setProfile(p => ({ ...p, weekly_training_hours: Number(e.target.value) }))} />
            </Field>
            <Field label="Dominant Limb">
              <select className="sg-input" value={profile.dominant_limb} onChange={e => setProfile(p => ({ ...p, dominant_limb: e.target.value }))}>
                <option value="RIGHT">Right</option>
                <option value="LEFT">Left</option>
                <option value="AMBIDEXTROUS">Ambidextrous</option>
              </select>
            </Field>
          </div>

          <div style={{ paddingTop: "4px" }}>
            <button type="submit" className="sg-btn sg-btn-primary" disabled={saving} style={{ padding: "10px 24px", fontSize: "14px" }}>
              {saving ? <><span className="sg-spinner" style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }} /> Saving...</> : (hasProfile ? "Update Profile" : "Create Profile")}
            </button>
          </div>
        </form>
      </div>

      {/* ── Link to Professional ── */}
      <div className="sg-card" style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>Link to Professional</h2>
        <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "16px" }}>Enter your Coach or Physiotherapist's invite code to share your video analysis data with them.</p>
        
        {linkMsg.text && (
          <div className={`sg-alert ${linkMsg.type === "success" ? "sg-alert-success" : "sg-alert-error"}`} style={{ marginBottom: "14px" }}>
            {linkMsg.text}
          </div>
        )}

        <form onSubmit={handleLink} style={{ display: "flex", gap: "12px" }}>
          <input 
            type="text" 
            className="sg-input" 
            placeholder="e.g. C-8B39F" 
            value={inviteCodeInput} 
            onChange={e => setInviteCodeInput(e.target.value.toUpperCase())}
            style={{ maxWidth: "200px", textTransform: "uppercase" }}
            required
          />
          <button type="submit" className="sg-btn sg-btn-primary" disabled={linking || !hasProfile} style={{ padding: "8px 16px", fontSize: "13px" }}>
            {linking ? "Linking..." : "Connect"}
          </button>
        </form>
        {!hasProfile && <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "8px" }}>Please create your profile first.</p>}
      </div>

      {/* ── Injury history ── */}
      <div className="sg-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>Injury History</h2>
          {hasProfile && (
            <button className="sg-btn sg-btn-ghost" style={{ fontSize: "13px", padding: "6px 14px" }}
              onClick={() => setShowInjuryForm(v => !v)}>
              {showInjuryForm ? "Cancel" : "Add Record"}
            </button>
          )}
        </div>

        {!hasProfile && (
          <p style={{ color: "#94a3b8", fontSize: "13px" }}>Save your profile first to add injury records.</p>
        )}

        {injuryMsg.text && (
          <div className={`sg-alert ${injuryMsg.type === "success" ? "sg-alert-success" : "sg-alert-error"}`} style={{ marginBottom: "14px" }}>
            {injuryMsg.text}
          </div>
        )}

        {/* ── Add injury form ── */}
        {showInjuryForm && (
          <form onSubmit={handleAddInjury} style={{
            background: "#f8fafc", border: "1px solid #e2e8f0",
            borderRadius: "10px", padding: "16px", marginBottom: "16px",
            display: "flex", flexDirection: "column", gap: "14px",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="Injury Name">
                <select
                  className="sg-input"
                  value={injury.injury_name}
                  onChange={e => setInjury(p => ({ ...p, injury_name: e.target.value }))}
                  required
                >
                  <option value="">Select injury...</option>
                  {INJURY_NAMES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </Field>
              <Field label="Affected Body Part">
                <select
                  className="sg-input"
                  value={injury.affected_body_part}
                  onChange={e => setInjury(p => ({ ...p, affected_body_part: e.target.value }))}
                  required
                >
                  <option value="">Select body part...</option>
                  {BODY_PARTS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="Date of Injury">
                <input type="date" className="sg-input" value={injury.injury_date} onChange={e => setInjury(p => ({ ...p, injury_date: e.target.value }))} required />
              </Field>
              <Field label="Recovery Duration (weeks)">
                <input type="number" className="sg-input" min={0} placeholder="Optional" value={injury.recovery_duration_weeks || ""} onChange={e => setInjury(p => ({ ...p, recovery_duration_weeks: e.target.value ? Number(e.target.value) : undefined }))} />
              </Field>
            </div>
            <Field label="Notes (optional)">
              <textarea className="sg-input" rows={2} placeholder="Any additional context about this injury..." value={injury.notes} onChange={e => setInjury(p => ({ ...p, notes: e.target.value }))} style={{ resize: "vertical" }} />
            </Field>
            <button type="submit" className="sg-btn sg-btn-primary" disabled={addingInjury} style={{ alignSelf: "flex-start", fontSize: "13px", padding: "8px 18px" }}>
              {addingInjury ? <><span className="sg-spinner" /> Adding...</> : "Add Record"}
            </button>
          </form>
        )}

        {/* ── Injury records list ── */}
        {injuries.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "13px", textAlign: "center", padding: "24px 0" }}>
            No injury records yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {injuries.map(inj => (
              <div key={inj.id} style={{
                padding: "14px 16px", background: "#f8fafc",
                border: "1px solid #e2e8f0", borderRadius: "8px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    {/* toLabel converts "ACL_TEAR" → "ACL Tear" for display */}
                    <p style={{ fontWeight: 600, fontSize: "14px", color: "#0f172a", marginBottom: "2px" }}>
                      {toLabel(INJURY_NAMES, inj.injury_name)}
                    </p>
                    <p style={{ fontSize: "13px", color: "#64748b" }}>
                      {toLabel(BODY_PARTS, inj.affected_body_part)}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className="sg-badge sg-badge-red" style={{ fontSize: "11px" }}>{inj.injury_date}</span>
                    {inj.recovery_duration_weeks && (
                      <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                        {inj.recovery_duration_weeks} wk recovery
                      </p>
                    )}
                  </div>
                </div>
                {inj.notes && <p style={{ marginTop: "8px", fontSize: "13px", color: "#64748b" }}>{inj.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Danger Zone ── */}
      <div className="sg-card" style={{ marginTop: "24px", border: "1px solid #fecaca" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#dc2626", marginBottom: "8px" }}>
          Danger Zone
        </h2>
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
          Permanently delete your account and all associated data. This action is irreversible.
        </p>
        <button
          onClick={handleDeleteAccount}
          style={{
            padding: "10px 16px",
            background: "#fee2e2",
            color: "#dc2626",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Delete Account
        </button>
      </div>

    </div>
  );
}
