"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { athleteApi, authApi, getToken, AthleteListItem } from "@/lib/api";

const RISK_CONFIG = {
  low:      { color: "#16a34a", bg: "#f0fdf4", label: "Low Risk" },
  moderate: { color: "#d97706", bg: "#fef3c7", label: "Moderate Risk" },
  high:     { color: "#dc2626", bg: "#fee2e2", label: "High Risk" },
  critical: { color: "#7c3aed", bg: "#ede9fe", label: "Critical Risk" },
};

const ROLE_LABELS: Record<string, string> = {
  coach:            "My Athletes",
  physiotherapist:  "Patients",
  scientist: "All Athletes",
};

export default function AthletesPage() {
  const router = useRouter();
  const [athletes, setAthletes] = useState<AthleteListItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [role, setRole]         = useState("coach");

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    authApi.getMe().then(u => {
      const r = u.role?.name ?? "athlete";
      setRole(r);
      if (r === "athlete") { router.push("/dashboard"); return; }
      athleteApi.getAllAthletes()
        .then(setAthletes)
        .catch(() => setAthletes([]))
        .finally(() => setLoading(false));
    }).catch(() => router.push("/login"));
  }, [router]);

  const riskCounts: Record<string, number> = { critical: 0, high: 0, moderate: 0, low: 0 };
  athletes.forEach(a => { if (a.latest_risk && a.latest_risk in riskCounts) riskCounts[a.latest_risk]++; });

  const filtered = athletes
    .filter(a => {
      const name = `${a.first_name} ${a.last_name}`.toLowerCase();
      const matchSearch = !search || name.includes(search.toLowerCase()) || (a.sport_type ?? "").toLowerCase().includes(search.toLowerCase());
      const matchRisk = riskFilter === "all" || a.latest_risk === riskFilter;
      return matchSearch && matchRisk;
    })
    .sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
      return (order[a.latest_risk ?? ""] ?? 4) - (order[b.latest_risk ?? ""] ?? 4);
    });

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", margin: 0 }}>{ROLE_LABELS[role] ?? "Athletes"}</h1>
        <p style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
          {loading ? "Loading..." : `${athletes.length} athlete${athletes.length !== 1 ? "s" : ""} on the platform`}
        </p>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
        {(["all", "critical", "high", "moderate", "low"]).map(r => {
          const rc = r !== "all" ? RISK_CONFIG[r as keyof typeof RISK_CONFIG] : null;
          const count = r === "all" ? athletes.length : (riskCounts[r] ?? 0);
          const active = riskFilter === r;
          return (
            <button key={r} onClick={() => setRiskFilter(r)} style={{ padding: "5px 14px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600, fontFamily: "inherit", background: active ? (rc?.bg ?? "#0f172a") : "#f1f5f9", color: active ? (rc?.color ?? "#fff") : "#64748b", outline: active ? `2px solid ${rc?.color ?? "#0f172a"}` : "none" }}>
              {r === "all" ? `All (${count})` : `${rc!.label} (${count})`}
            </button>
          );
        })}
      </div>

      <div style={{ marginBottom: "20px" }}>
        <input type="text" placeholder="Search by name or sport..." value={search} onChange={e => setSearch(e.target.value)} className="sg-input" style={{ maxWidth: "360px" }} />
      </div>

      {loading ? (
        <p style={{ color: "#94a3b8", fontSize: "14px" }}>Loading athletes...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <p style={{ fontSize: "16px", color: "#64748b", fontWeight: 500 }}>No athletes found</p>
          <p style={{ fontSize: "13px", color: "#94a3b8" }}>Try a different search or filter</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
          {filtered.map(a => {
            const rc = a.latest_risk ? RISK_CONFIG[a.latest_risk as keyof typeof RISK_CONFIG] : null;
            const sym = a.latest_symmetry != null ? Math.round(a.latest_symmetry * 100) : null;
            const lastSeen = a.last_session_at ? new Date(a.last_session_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No sessions yet";
            return (
              <Link key={a.user_id} href={`/dashboard/athletes/${a.user_id}`} style={{ textDecoration: "none" }}>
                <div className="sg-card" style={{ cursor: "pointer", transition: "all 0.15s", borderLeft: rc ? `4px solid ${rc.color}` : "4px solid #e2e8f0" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "50%", flexShrink: 0, background: rc?.bg ?? "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "15px", color: rc?.color ?? "#64748b" }}>
                      {a.first_name[0]}{a.last_name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a", marginBottom: "2px" }}>{a.first_name} {a.last_name}</p>
                      <p style={{ fontSize: "12px", color: "#94a3b8" }}>{a.sport_type ?? "No sport set"}</p>
                    </div>
                    {rc && <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: rc.bg, color: rc.color, flexShrink: 0 }}>{rc.label}</span>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>{a.session_count}</p>
                      <p style={{ fontSize: "11px", color: "#94a3b8" }}>Sessions</p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "18px", fontWeight: 800, color: sym != null && sym < 75 ? "#d97706" : "#16a34a" }}>{sym != null ? `${sym}%` : "---"}</p>
                      <p style={{ fontSize: "11px", color: "#94a3b8" }}>Symmetry</p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "11px", fontWeight: 600, color: "#475569", marginTop: "4px" }}>{lastSeen}</p>
                      <p style={{ fontSize: "11px", color: "#94a3b8" }}>Last session</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
