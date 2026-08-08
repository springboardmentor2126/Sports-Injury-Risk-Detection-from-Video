import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaRunning, FaSignOutAlt } from "react-icons/fa";

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    // FIX: was removeItem("token") - the key Login.js actually stores under
    // is "access_token". Removing the wrong key left the real token sitting
    // in localStorage after "logout", so api.js would keep attaching it to
    // requests as if the user were still signed in.
    localStorage.removeItem("access_token");
    setUser(null);
    alert("Logged out successfully");
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="container navbar-content">
        <Link to="/" className="logo">
          <FaRunning />
          <span>SportsAI</span>
        </Link>

        <div className="nav-links">
          <Link
            to="/"
            style={{
              color: location.pathname === "/" ? "#2563EB" : ""
            }}
          >
            Home
          </Link>

          {user && (
            <>
              <Link
                to="/dashboard"
                style={{
                  color: location.pathname === "/dashboard" ? "#2563EB" : ""
                }}
              >
                Dashboard
              </Link>

              <Link
                to="/athlete-profile"
                style={{
                  color: location.pathname === "/athlete-profile" ? "#2563EB" : ""
                }}
              >
                Profile
              </Link>

              <Link
                to="/upload-video"
                style={{
                  color: location.pathname === "/upload-video" ? "#2563EB" : ""
                }}
              >
                Upload
              </Link>

              {user.role === "Administrator" && (
                <Link
                  to="/admin"
                  style={{
                    color: location.pathname === "/admin" ? "#2563EB" : ""
                  }}
                >
                  Admin
                </Link>
              )}
            </>
          )}
        </div>

        <div className="nav-actions">
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#475569" }}>
                {user.name} ({user.role})
              </span>
              <button onClick={handleLogout} className="btn-outline" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px" }}>
                <FaSignOutAlt /> Logout
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-outline">
                Login
              </Link>
              <Link to="/register" className="btn">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
