import { useEffect, useState } from "react";
import {
    FaFlask,
    FaChartLine,
    FaRunning,
    FaBrain,
    FaHeartbeat
} from "react-icons/fa";
import api from "../services/api";

export default function ScientistDashboard() {

    const [data, setData] = useState([]);

    useEffect(() => {

        loadData();

    }, []);

    async function loadData() {

        try {

            const token = localStorage.getItem("token");

            const response = await api.get(
                "/video/my-videos",
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setData(response.data);

        }

        catch (err) {

            console.log(err);

        }

    }

    const average = (field) => {

        if (data.length === 0) return 0;

        return (
            data.reduce(
                (sum, item) =>
                    sum + Number(item[field] || 0),
                0
            ) / data.length
        ).toFixed(1);

    };

    return (

        <div className="dashboard">

            <div className="hero">

                <div>

                    <h1>

                        Sports Scientist Dashboard

                    </h1>

                    <p>

                        Biomechanical analytics, research insights and athlete performance monitoring.

                    </p>

                </div>

            </div>

            <div className="stats">

                <div className="stat-card">

                    <FaRunning size={35}/>

                    <h2>

                        {data.length}

                    </h2>

                    <p>

                        Analyses

                    </p>

                </div>

                <div className="stat-card">

                    <FaChartLine size={35}/>

                    <h2>

                        {average("left_knee_angle")}°

                    </h2>

                    <p>

                        Avg Left Knee

                    </p>

                </div>

                <div className="stat-card">

                    <FaHeartbeat size={35}/>

                    <h2>

                        {average("posture_symmetry")}%

                    </h2>

                    <p>

                        Avg Symmetry

                    </p>

                </div>

                <div className="stat-card">

                    <FaBrain size={35}/>

                    <h2>

                        AI

                    </h2>

                    <p>

                        Research Ready

                    </p>

                </div>

            </div>

            <div className="middle-section">

                <div className="upload-card">

                    <h2>

                        Biomechanical Analytics

                    </h2>

                    <table>

                        <tbody>

                            <tr>

                                <td>Average Left Knee</td>

                                <td>{average("left_knee_angle")}°</td>

                            </tr>

                            <tr>

                                <td>Average Right Knee</td>

                                <td>{average("right_knee_angle")}°</td>

                            </tr>

                            <tr>

                                <td>Average Left Hip</td>

                                <td>{average("left_hip_angle")}°</td>

                            </tr>

                            <tr>

                                <td>Average Right Hip</td>

                                <td>{average("right_hip_angle")}°</td>

                            </tr>

                            <tr>

                                <td>Average Shoulder</td>

                                <td>{average("left_shoulder_angle")}°</td>

                            </tr>

                            <tr>

                                <td>Average Elbow</td>

                                <td>{average("left_elbow_angle")}°</td>

                            </tr>

                        </tbody>

                    </table>

                </div>

                <div className="tips-card">

                    <h2>

                        AI Research Insights

                    </h2>

                    <ul style={{lineHeight:2}}>

                        <li>

                            Pose estimation performed using MediaPipe Pose.

                        </li>

                        <li>

                            Joint angles calculated using biomechanical geometry.

                        </li>

                        <li>

                            Posture symmetry evaluated from left-right comparison.

                        </li>

                        <li>

                            Movement quality classified from extracted biomechanics.

                        </li>

                        <li>

                            Injury prediction model integration scheduled in Milestone 3.

                        </li>

                    </ul>

                </div>

            </div>

            <div className="recent-card">

                <h2>

                    Research Report

                </h2>

                {

                    data.length===0 ?

                    <p>

                        No research data available.

                    </p>

                    :

                    <table>

                        <thead>

                            <tr>

                                <th>Video</th>

                                <th>Left Knee</th>

                                <th>Right Knee</th>

                                <th>Symmetry</th>

                                <th>Movement</th>

                                <th>Risk</th>

                            </tr>

                        </thead>

                        <tbody>

                            {

                                data.map(item=>(

                                    <tr key={item.id}>

                                        <td>{item.filename}</td>

                                        <td>{Number(item.left_knee_angle).toFixed(1)}°</td>

                                        <td>{Number(item.right_knee_angle).toFixed(1)}°</td>

                                        <td>{Number(item.posture_symmetry).toFixed(1)}%</td>

                                        <td>{item.movement_quality}</td>

                                        <td>{item.injury_risk}</td>

                                    </tr>

                                ))

                            }

                        </tbody>

                    </table>

                }

            </div>

        </div>

    );

}