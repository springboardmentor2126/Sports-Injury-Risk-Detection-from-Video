import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import MainLayout from "../components/MainLayout";

function AthleteDashboard() {
    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem("user") || "null");

    return (
        <MainLayout>
            <div className="Dashboard-container">

                {/* =========================
                    Dashboard Header
                ========================= */}
                <div className="Dashboard-header">
                    <div>
                        <h1>Sports Injury Risk Detection</h1>

                        <p>
                            Monitor your athletic performance and assess injury risk.
                        </p>
                    </div>
                </div>

                {/* =========================
                    Dashboard Title
                ========================= */}
                <div className="dashboard-title-section">
                    <h2>Athlete Dashboard</h2>

                    <p>
                        Welcome back! Manage your profile and analyze your injury risk.
                    </p>
                </div>

                {/* =========================
                    User Dashboard
                ========================= */}
                {user ? (
                    <div className="Dashboard-grid">

                        {/* =========================
                            Welcome Card
                        ========================= */}
                        <div className="Dashboard-card welcome-card">

                            <div className="card-icon">
                                👋
                            </div>

                            <h3>
                                Welcome, {user.full_name}
                            </h3>

                            <div className="welcome-details">
                                <p>
                                    <strong>Email:</strong>
                                    <span>{user.email}</span>
                                </p>

                                <p>
                                    <strong>Role:</strong>
                                    <span>{user.role}</span>
                                </p>
                            </div>

                        </div>

                        {/* =========================
                            Athlete Profile
                        ========================= */}
                        <div className="Dashboard-card">

                            <div className="card-icon">
                                👤
                            </div>

                            <h3>Athlete Profile</h3>

                            <p>
                                View and manage your personal athlete
                                information.
                            </p>

                            <button
                                type="button"
                                onClick={() => navigate("/athlete-profile")}
                            >
                                View Profile
                            </button>

                        </div>

                        {/* =========================
                            Injury Risk Analysis
                        ========================= */}
                        <div className="Dashboard-card">

                            <div className="card-icon">
                                🎥
                            </div>

                            <h3>Injury Risk Analysis</h3>

                            <p>
                                Upload your movement video and analyze
                                potential injury risk.
                            </p>

                            <button
                                type="button"
                                onClick={() => navigate("/upload-video")}
                            >
                                Analyze Injury Risk
                            </button>

                        </div>

                        {/* =========================
                            Performance
                        ========================= */}
                        <div className="Dashboard-card">

                            <div className="card-icon">
                                📈
                            </div>

                            <h3>Performance</h3>

                            <p>
                                Track your athletic performance and
                                review your previous results.
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/athlete-performance")
                                }
                            >
                                View Performance
                            </button>

                        </div>

                        {/* =========================
                            Injury Reports
                        ========================= */}
                        <div className="Dashboard-card">

                            <div className="card-icon">
                                📋
                            </div>

                            <h3>Injury Reports</h3>

                            <p>
                                View your previous injury risk reports
                                and assessment results.
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/injury-reports")
                                }
                            >
                                View Reports
                            </button>

                        </div>

                    </div>
                ) : (

                    /* =========================
                       No User Information
                    ========================= */
                    <div className="Dashboard-card login-warning-card">

                        <div className="card-icon">
                            ⚠️
                        </div>

                        <h3>User information not found</h3>

                        <p>
                            Your login information could not be found.
                            Please login again to access your athlete dashboard.
                        </p>

                        <button
                            type="button"
                            onClick={() => navigate("/")}
                        >
                            Go to Login
                        </button>

                    </div>
                )}

            </div>
        </MainLayout>
    );
}

export default AthleteDashboard;