import { useEffect, useState } from "react";
import {
    FaHeartbeat,
    FaRunning,
    FaClipboardCheck,
    FaUserInjured
} from "react-icons/fa";
import api from "../services/api";

export default function PhysioDashboard() {

    const [patients, setPatients] = useState([]);

    useEffect(() => {

        loadPatients();

    }, []);

    async function loadPatients() {

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

            setPatients(response.data);

        }

        catch (err) {

            console.log(err);

        }

    }

    const highRisk =
        patients.filter(
            p => p.injury_risk === "HIGH"
        ).length;

    return (

        <div className="dashboard">

            <div className="hero">

                <div>

                    <h1>

                        Physiotherapist Dashboard

                    </h1>

                    <p>

                        Rehabilitation tracking and recovery monitoring.

                    </p>

                </div>

            </div>

            <div className="stats">

                <div className="stat-card">

                    <FaHeartbeat size={35}/>

                    <h2>

                        {patients.length}

                    </h2>

                    <p>

                        Patients

                    </p>

                </div>

                <div className="stat-card">

                    <FaUserInjured size={35}/>

                    <h2>

                        {highRisk}

                    </h2>

                    <p>

                        High Risk

                    </p>

                </div>

                <div className="stat-card">

                    <FaRunning size={35}/>

                    <h2>

                        92%

                    </h2>

                    <p>

                        Recovery Progress

                    </p>

                </div>

                <div className="stat-card">

                    <FaClipboardCheck size={35}/>

                    <h2>

                        {patients.length}

                    </h2>

                    <p>

                        Reports

                    </p>

                </div>

            </div>

            <div className="middle-section">

                <div className="upload-card">

                    <h2>

                        Injury Risk Monitoring

                    </h2>

                    {

                        patients.length===0 ?

                        <p>

                            No data available.

                        </p>

                        :

                        patients.map(patient=>(

                            <div
                                key={patient.id}
                                style={{
                                    marginBottom:"15px",
                                    borderBottom:"1px solid #ddd",
                                    paddingBottom:"10px"
                                }}
                            >

                                <strong>

                                    {patient.filename}

                                </strong>

                                <p>

                                    Risk :

                                    {patient.injury_risk}

                                </p>

                                <p>

                                    Movement :

                                    {patient.movement_quality}

                                </p>

                            </div>

                        ))

                    }

                </div>

                <div className="tips-card">

                    <h2>

                        Recovery Recommendations

                    </h2>

                    <ul
                        style={{
                            lineHeight:2
                        }}
                    >

                        <li>

                            Improve hip stability exercises.

                        </li>

                        <li>

                            Strengthen knee stabilizers.

                        </li>

                        <li>

                            Monitor posture symmetry weekly.

                        </li>

                        <li>

                            Reduce training load if HIGH risk.

                        </li>

                        <li>

                            Continue mobility exercises.

                        </li>

                    </ul>

                </div>

            </div>

            <div className="recent-card">

                <h2>

                    Rehabilitation Reports

                </h2>

                {

                    patients.length===0 ?

                    <p>

                        No reports.

                    </p>

                    :

                    <table>

                        <thead>

                            <tr>

                                <th>Video</th>
                                <th>Movement</th>
                                <th>Risk</th>
                                <th>Symmetry</th>

                            </tr>

                        </thead>

                        <tbody>

                            {

                                patients.map(patient=>(

                                    <tr key={patient.id}>

                                        <td>

                                            {patient.filename}

                                        </td>

                                        <td>

                                            {patient.movement_quality}

                                        </td>

                                        <td>

                                            {patient.injury_risk}

                                        </td>

                                        <td>

                                            {Number(patient.posture_symmetry||0).toFixed(1)}%

                                        </td>

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