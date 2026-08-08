import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import MainLayout from "../components/MainLayout";

function CoachDashboard() {

    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem("user"));

    return (

        <MainLayout>

            <div className="Dashboard-container">

                <div className="Dashboard-header">

                    <h1>Sports Injury Risk Detection</h1>

                </div>

                <h2>Coach Dashboard</h2>

                {user && (

                    <div className="Dashboard-grid">

                        <div className="Dashboard-card">

                            <h3>
                                Welcome {user.full_name} 👋
                            </h3>

                            <p>
                                <b>Email:</b> {user.email}
                            </p>

                            <p>
                                <b>Role:</b> {user.role}
                            </p>

                        </div>

                        <div className="Dashboard-card">

                            <h3>Athlete Video Analysis</h3>

                            <p>
                                Upload athlete video for AI injury analysis.
                            </p>

                            <button
                                onClick={() => navigate("/upload-video")}
                            >
                                Upload Athlete Video
                            </button>

                        </div>

                        <div className="Dashboard-card">

                            <h3>Injury Reports</h3>

                            <p>
                                View generated injury reports.
                            </p>

                            <button
                                onClick={() => navigate("/injury-reports")}
                            >
                                View Injury Reports
                            </button>

                        </div>

                        <div className="Dashboard-card">

                            <h3>Athlete Performance</h3>

                            <p>
                                Monitor athlete performance.
                            </p>

                            <button
                                onClick={() => navigate("/athlete-performance")}
                            >
                                View Performance
                            </button>

                        </div>

                    </div>

                )}

            </div>

        </MainLayout>

    );

}

export default CoachDashboard;