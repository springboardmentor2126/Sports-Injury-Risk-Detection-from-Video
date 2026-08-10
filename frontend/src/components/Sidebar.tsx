import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/profile", label: "Athlete Profile" },
  { to: "/upload", label: "Upload Video" },
  { to: "/reports", label: "Reports History" },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-line bg-court-graphite">
      <div className="px-6 py-6">
        <p className="font-display text-lg font-semibold leading-tight">
          Injury Risk
        </p>
        <p className="font-display text-lg font-semibold leading-tight text-pulse-cyan">
          Detection
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-court-graphite-light text-text-primary"
                  : "text-text-muted hover:bg-court-graphite-light hover:text-text-primary"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line px-4 py-4">
        <p className="truncate text-sm font-medium text-text-primary">
          {user?.full_name}
        </p>
        <p className="mb-3 text-xs uppercase tracking-wide text-text-muted">
          {user?.role.replace("_", " ")}
        </p>
        <button
          onClick={logout}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-text-muted transition-colors hover:border-risk-high hover:text-risk-high"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
