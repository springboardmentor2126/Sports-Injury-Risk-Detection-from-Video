import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Videos from "./pages/Videos";
import Dashboard from "./pages/Dashboard";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="navbar">
      <Link to="/" className="brand">
        <span className="dot" />
        Sports Injury Risk
      </Link>
      {user ? (
        <>
          <div className="nav-links">
            <Link to="/dashboard" className={isActive("/dashboard") ? "active" : ""}>Dashboard</Link>
            <Link to="/videos" className={isActive("/videos") ? "active" : ""}>Videos</Link>
            <Link to="/profile" className={isActive("/profile") ? "active" : ""}>Profile</Link>
          </div>
          <div className="nav-right">
            <span>{user.full_name} · {user.role}</span>
            <button onClick={handleLogout}>Log out</button>
          </div>
        </>
      ) : (
        <div className="nav-right">
          <span>Sports Injury Risk Detection Platform</span>
        </div>
      )}
    </div>
  );
}

function HomeRedirect() {
  const { token } = useAuth();
  return <Navigate to={token ? "/dashboard" : "/login"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
