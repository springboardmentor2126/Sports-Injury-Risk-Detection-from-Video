"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { authApi, getToken, removeToken } from "@/lib/api";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: { id: number; name: string };
}

const VIDEO_ICON = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>;
const GRID_ICON  = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const USER_ICON  = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const TEAM_ICON  = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const CHART_ICON = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;

function getNavItems(role: string) {
  switch (role) {
    case "coach":
      return [
        { href: "/dashboard",          label: "Overview",    icon: GRID_ICON },
        { href: "/dashboard/athletes", label: "My Athletes", icon: TEAM_ICON },
        { href: "/dashboard/profile",  label: "Account",     icon: USER_ICON },
      ];
    case "physiotherapist":
      return [
        { href: "/dashboard",          label: "Overview",  icon: GRID_ICON },
        { href: "/dashboard/athletes", label: "Athletes",  icon: TEAM_ICON },
        { href: "/dashboard/profile",  label: "Account",   icon: USER_ICON },
      ];
    case "scientist":
      return [
        { href: "/dashboard",          label: "Overview",     icon: GRID_ICON },
        { href: "/dashboard/athletes", label: "All Athletes", icon: TEAM_ICON },
        { href: "/dashboard/profile",  label: "Account",      icon: USER_ICON },
      ];
    default: // athlete
      return [
        { href: "/dashboard",          label: "Overview",        icon: GRID_ICON },
        { href: "/dashboard/analyze",  label: "Analyze Video",   icon: VIDEO_ICON },
        { href: "/dashboard/profile",  label: "Athlete Profile", icon: USER_ICON },
      ];
  }
}


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    authApi.getMe()
      .then(setUser)
      .catch(() => { removeToken(); router.push("/login"); })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f8fafc",
      }}>
        <div style={{ textAlign: "center" }}>
          <div className="sg-spinner" style={{ margin: "0 auto 12px", width: "24px", height: "24px", border: "2px solid #e2e8f0", borderTopColor: "#2563eb" }} />
          <p style={{ fontSize: "14px", color: "#64748b" }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: "228px",
        background: "#ffffff",
        borderRight: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0, left: 0,
        height: "100vh",
        zIndex: 40,
      }}>
        {/* Logo */}
        <div style={{
          padding: "18px 20px",
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}>
          <div style={{
            width: "30px", height: "30px",
            background: "#2563eb", borderRadius: "7px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}>SportGuard</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {getNavItems(user?.role?.name ?? "athlete").map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "9px 12px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: active ? 600 : 500,
                fontSize: "14px",
                color: active ? "#1d4ed8" : "#475569",
                background: active ? "#eff6ff" : "transparent",
                marginBottom: "2px",
                transition: "all 0.1s",
              }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        {user && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9" }}>
            <div style={{
              padding: "12px",
              background: "#f8fafc",
              borderRadius: "8px",
              marginBottom: "8px",
            }}>
              <p style={{ fontWeight: 600, fontSize: "13px", color: "#0f172a", marginBottom: "2px" }}>
                {user.first_name} {user.last_name}
              </p>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>{user.email}</p>
              <span className="sg-badge sg-badge-blue" style={{ fontSize: "11px" }}>
                {user.role.name}
              </span>
            </div>
            <button
              onClick={() => { removeToken(); router.push("/login"); }}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "transparent",
                border: "1px solid #e2e8f0",
                borderRadius: "7px",
                fontSize: "13px",
                fontWeight: 500,
                color: "#64748b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.1s",
                fontFamily: "inherit",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "#fee2e2";
                (e.currentTarget as HTMLElement).style.color = "#b91c1c";
                (e.currentTarget as HTMLElement).style.borderColor = "#fca5a5";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "#64748b";
                (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, marginLeft: "228px", padding: "32px", minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
