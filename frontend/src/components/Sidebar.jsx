import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
    };

    const isActive = (path) => location.pathname === path;

    return (
        <aside className="sidebar">

            {/* Logo */}
            <div className="sidebar-logo">
                <div className="logo-icon">⚕</div>

                <div>
                    <h2>SportsAI</h2>
                    <span>Injury Risk Detection</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-menu">

                <Link
                    to="/dashboard"
                    className={isActive("/dashboard") ? "active" : ""}
                >
                    <span className="menu-icon">⌂</span>
                    <span>Dashboard</span>
                </Link>

                <Link
                    to="/athlete-profile"
                    className={isActive("/athlete-profile") ? "active" : ""}
                >
                    <span className="menu-icon">👤</span>
                    <span>Athlete Profile</span>
                </Link>

                <Link
                    to="/upload-video"
                    className={isActive("/upload-video") ? "active" : ""}
                >
                    <span className="menu-icon">🎥</span>
                    <span>Upload Video</span>
                </Link>

                <Link
                    to="/injury-reports"
                    className={isActive("/injury-reports") ? "active" : ""}
                >
                    <span className="menu-icon">📊</span>
                    <span>Reports</span>
                </Link>

            </nav>

            {/* Bottom Section */}
            <div className="sidebar-bottom">

                <div className="sidebar-divider"></div>

                <button
                    type="button"
                    className="logout-btn"
                    onClick={handleLogout}
                >
                    <span className="menu-icon">↪</span>
                    <span>Logout</span>
                </button>

            </div>

        </aside>
    );
}

export default Sidebar;