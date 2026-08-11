import { useEffect, useState } from "react";
import {
    FaUsers,
    FaRunning,
    FaExclamationTriangle,
    FaChartLine,
    FaHeartbeat
} from "react-icons/fa";
import api from "../services/api";

export default function CoachDashboard() {

    const [team, setTeam] = useState([]);

    useEffect(() => {
        loadTeam();
    }, []);

    async function loadTeam() {

        try {

            const token = localStorage.getItem("token");

            const response = await api.get("/video/my-videos", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setTeam(response.data);

        }

        catch (err) {

            console.log(err);

        }

    }

    const totalAthletes = team.length;

    const highRisk = team.filter(
        athlete => athlete.injury_risk === "HIGH"
    ).length;

    const mediumRisk = team.filter(
        athlete => athlete.injury_risk === "MEDIUM"
    ).length;

    const lowRisk = team.filter(
        athlete => athlete.injury_risk === "LOW"
    ).length;

    return (

        <div className="dashboard">

            <div className="hero">

                <div>

                    <h1>

                        Coach Dashboard

                    </h1>

                    <p>

                        Team monitoring, injury prevention,
                        movement quality and athlete performance.

                    </p>

                </div>

            </div>

            <div className="stats">

                <div className="stat-card">

                    <FaUsers size={35}/>

                    <h2>{totalAthletes}</h2>

                    <p>Total Athletes</p>

                </div>

                <div className="stat-card">

                    <FaHeartbeat size={35}/>

                    <h2>{highRisk}</h2>

                    <p>High Risk</p>

                </div>

                <div className="stat-card">

                    <FaExclamationTriangle size={35}/>

                    <h2>{mediumRisk}</h2>

                    <p>Medium Risk</p>

                </div>

                <div className="stat-card">

                    <FaRunning size={35}/>

                    <h2>{lowRisk}</h2>

                    <p>Low Risk</p>

                </div>

            </div>

            <div className="middle-section">

                <div className="upload-card">

                    <h2>

                        Team Risk Overview

                    </h2>

                    <table>

                        <thead>

                            <tr>

                                <th>Risk Level</th>

                                <th>Athletes</th>

                            </tr>

                        </thead>

                        <tbody>

                            <tr>

                                <td>High</td>

                                <td>{highRisk}</td>

                            </tr>

                            <tr>

                                <td>Medium</td>

                                <td>{mediumRisk}</td>

                            </tr>

                            <tr>

                                <td>Low</td>

                                <td>{lowRisk}</td>

                            </tr>

                        </tbody>

                    </table>

                </div>

                <div className="tips-card">

                    <h2>

                        Athlete Performance Analytics

                    </h2>

                    {

                        team.length === 0 ?

                        <p>

                            No athlete data available.

                        </p>

                        :

                        team.map(player => (

                            <div
                                key={player.id}
                                style={{
                                    borderBottom:"1px solid #ddd",
                                    paddingBottom:"12px",
                                    marginBottom:"12px"
                                }}
                            >

                                <strong>

                                    {player.filename}

                                </strong>

                                <p>

                                    Movement :

                                    {" "}

                                    {player.movement_quality}

                                </p>

                                <p>

                                    Injury Risk :

                                    {" "}

                                    {player.injury_risk}

                                </p>

                            </div>

                        ))

                    }

                </div>

            </div>
                        <div className="recent-card">

                <h2>

                    <FaChartLine />

                    {" "}Movement Quality Reports

                </h2>

                {

                    team.length === 0 ?

                    <p>

                        No reports available.

                    </p>

                    :

                    <table>

                        <thead>

                            <tr>

                                <th>Video</th>

                                <th>Movement</th>

                                <th>Risk</th>

                                <th>Symmetry</th>

                                <th>Average Knee</th>

                            </tr>

                        </thead>

                        <tbody>

                            {

                                team.map(player => {

                                    const averageKnee =
                                        (
                                            Number(player.left_knee_angle || 0) +
                                            Number(player.right_knee_angle || 0)
                                        ) / 2;

                                    return (

                                        <tr key={player.id}>

                                            <td>

                                                {player.filename}

                                            </td>

                                            <td>

                                                {player.movement_quality}

                                            </td>

                                            <td>

                                                {player.injury_risk}

                                            </td>

                                            <td>

                                                {Number(player.posture_symmetry || 0).toFixed(1)}%

                                            </td>

                                            <td>

                                                {averageKnee.toFixed(1)}°

                                            </td>

                                        </tr>

                                    );

                                })

                            }

                        </tbody>

                    </table>

                }

            </div>

            <div
                className="middle-section"
                style={{ marginTop: "30px" }}
            >

                <div className="upload-card">

                    <h2>

                        Training Recommendations

                    </h2>

                    <ul
                        style={{
                            lineHeight: "2"
                        }}
                    >

                        <li>

                            High-risk athletes should undergo detailed biomechanical assessment.

                        </li>

                        <li>

                            Focus on improving movement symmetry during training.

                        </li>

                        <li>

                            Monitor knee valgus and hip stability regularly.

                        </li>

                        <li>

                            Schedule weekly movement screening sessions.

                        </li>

                        <li>

                            Encourage adequate recovery between intensive sessions.

                        </li>

                    </ul>

                </div>

                <div className="tips-card">

                    <h2>

                        Recent Activity

                    </h2>

                    <p>

                        ✔ Team data synchronized.

                    </p>

                    <p>

                        ✔ Injury risk updated.

                    </p>

                    <p>

                        ✔ Movement reports generated.

                    </p>

                    <p>

                        ✔ Performance analytics available.

                    </p>

                    <p>

                        ✔ Coach recommendations prepared.

                    </p>

                </div>

            </div>

        </div>

    );

}