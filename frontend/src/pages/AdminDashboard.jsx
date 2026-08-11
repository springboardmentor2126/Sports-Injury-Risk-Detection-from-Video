export default function AdminDashboard() {

    return (

        <div className="dashboard">

            <div className="hero">

                <div>

                    <h1>Admin Dashboard</h1>

                    <p>

                        Platform monitoring and system administration.

                    </p>

                </div>

            </div>

            <div className="stats">

                <div className="stat-card">
                    <h2>120</h2>
                    <p>Total Users</p>
                </div>

                <div className="stat-card">
                    <h2>56</h2>
                    <p>Total Videos</p>
                </div>

                <div className="stat-card">
                    <h2>98%</h2>
                    <p>System Uptime</p>
                </div>

                <div className="stat-card">
                    <h2>Healthy</h2>
                    <p>Server Status</p>
                </div>

            </div>

            <div className="middle-section">

                <div className="upload-card">

                    <h2>User Management</h2>

                    <ul>

                        <li>✔ View Registered Users</li>
                        <li>✔ Delete Inactive Users</li>
                        <li>✔ Manage Roles</li>
                        <li>✔ Reset Passwords</li>

                    </ul>

                </div>

                <div className="tips-card">

                    <h2>Platform Analytics</h2>

                    <ul>

                        <li>Total Athlete Accounts</li>
                        <li>Total Coaches</li>
                        <li>Total Physiotherapists</li>
                        <li>Total Scientists</li>

                    </ul>

                </div>

            </div>

            <div className="recent-card">

                <h2>Reports</h2>

                <ul>

                    <li>Daily Usage Report</li>

                    <li>Weekly Analysis Report</li>

                    <li>Monthly Activity Report</li>

                    <li>System Error Logs</li>

                </ul>

            </div>

        </div>

    );

}