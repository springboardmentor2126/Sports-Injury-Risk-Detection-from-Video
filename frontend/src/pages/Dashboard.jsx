import { useEffect, useState } from "react";
import { FaUserCircle } from "react-icons/fa";
import api from "../services/api";
import VideoUpload from "../components/VideoUpload";
import "../styles/dashboard.css";

export default function Dashboard() {

    const [user, setUser] = useState({});
    const [videos, setVideos] = useState([]);
    const [latestAnalysis, setLatestAnalysis] = useState(null);

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        await Promise.all([
            getUser(),
            getVideos()
        ]);
    }

    async function getUser() {

        try {

            const token = localStorage.getItem("token");

            const response = await api.get("/auth/me", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setUser(response.data);

        } catch (err) {

            console.log(err);

        }

    }

    async function getVideos() {

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

            // ⭐ Flatten backend response
            const formattedVideos = response.data.map(video => ({
                id: video.id,
                filename: video.filename,
                ...(video.analysis || {})
            }));

            setVideos(formattedVideos);

            if (formattedVideos.length > 0) {
                setLatestAnalysis(
                    formattedVideos[formattedVideos.length - 1]
                );
            } else {
                setLatestAnalysis(null);
            }

        } catch (err) {

            console.log(err);

        }

    }

    async function handleUploadSuccess(analysis) {

        setLatestAnalysis({
            ...analysis
        });

        await getVideos();

    }

    const latestVideo =
        latestAnalysis ||
        (videos.length > 0
            ? videos[videos.length - 1]
            : null);

    return (

        <div className="dashboard">

            <div className="hero">

                <div>

                    <h1>
                        Welcome back, {user.username || "Athlete"} 👋
                    </h1>

                    <p>
                        Upload your training videos and let AI analyze your biomechanics, posture and injury risk.
                    </p>

                    <h3>
                        Sport :
                        <span> {user.sport || "Not Updated"}</span>
                    </h3>

                </div>

                <FaUserCircle className="profile-icon" />

            </div>

            <div className="stats">

                <div className="stat-card">

                    <h2>{videos.length}</h2>

                    <p>Videos Uploaded</p>

                </div>

                <div className="stat-card">

                    <h2>

                        {
                            latestVideo
                                ? (
                                    (
                                        Number(latestVideo.left_knee_angle || 0) +
                                        Number(latestVideo.right_knee_angle || 0)
                                    ) / 2
                                ).toFixed(1)
                                : "--"
                        }°

                    </h2>

                    <p>Average Knee Angle</p>

                </div>

                <div className="stat-card">

                    <h2>

                        {
                            latestVideo
                                ? latestVideo.injury_risk
                                : "--"
                        }

                    </h2>

                    <p>Current Injury Risk</p>

                </div>

            </div>

            <div className="middle-section">

                

                <div className="tips-card">

                    <h2>Latest Analysis</h2>

                    {
                        latestVideo ?

                        <>

                            <p><strong>Frames Processed:</strong> {latestVideo.frames_processed}</p>

                            <p><strong>Pose Frames:</strong> {latestVideo.pose_detected_frames}</p>

                            <hr />

                            <p><strong>Left Knee:</strong> {Number(latestVideo.left_knee_angle || 0).toFixed(1)}°</p>

                            <p><strong>Right Knee:</strong> {Number(latestVideo.right_knee_angle || 0).toFixed(1)}°</p>

                            <p><strong>Left Hip:</strong> {Number(latestVideo.left_hip_angle || 0).toFixed(1)}°</p>

                            <p><strong>Right Hip:</strong> {Number(latestVideo.right_hip_angle || 0).toFixed(1)}°</p>

                            <p><strong>Left Shoulder:</strong> {Number(latestVideo.left_shoulder_angle || 0).toFixed(1)}°</p>

                            <p><strong>Right Shoulder:</strong> {Number(latestVideo.right_shoulder_angle || 0).toFixed(1)}°</p>

                            <p><strong>Left Elbow:</strong> {Number(latestVideo.left_elbow_angle || 0).toFixed(1)}°</p>

                            <p><strong>Right Elbow:</strong> {Number(latestVideo.right_elbow_angle || 0).toFixed(1)}°</p>

                            <hr />

                            <p><strong>Posture Symmetry:</strong> {Number(latestVideo.posture_symmetry || 0).toFixed(1)}%</p>

                            <p><strong>Movement Quality:</strong> {latestVideo.movement_quality}</p>

                            <p><strong>Injury Risk:</strong> {latestVideo.injury_risk}</p>

                            <hr />

                            <p><strong>AI Recommendation</strong></p>

                            <p>{latestVideo.recommendation}</p>

                        </>

                        :

                        <p>
                            Analyze a video to view the results here.
                        </p>
                    }

                </div>

            </div>

            <div className="recent-card">

                <h2>Analysis History</h2>

                {

                    videos.length === 0 ?

                        <p>No videos uploaded yet.</p>

                        :

                        <table>

                            <thead>

                                <tr>
                                    <th>Video</th>
                                    <th>Knee (L/R)</th>
                                    <th>Hip (L/R)</th>
                                    <th>Shoulder (L/R)</th>
                                    <th>Elbow (L/R)</th>
                                    <th>Symmetry</th>
                                    <th>Movement</th>
                                    <th>Risk</th>
                                </tr>

                            </thead>

                            <tbody>

                                {

                                    videos.map(video => (

                                        <tr key={video.id}>

                                            <td>{video.filename}</td>

                                            <td>
                                                {Number(video.left_knee_angle || 0).toFixed(1)}° / {Number(video.right_knee_angle || 0).toFixed(1)}°
                                            </td>

                                            <td>
                                                {Number(video.left_hip_angle || 0).toFixed(1)}° / {Number(video.right_hip_angle || 0).toFixed(1)}°
                                            </td>

                                            <td>
                                                {Number(video.left_shoulder_angle || 0).toFixed(1)}° / {Number(video.right_shoulder_angle || 0).toFixed(1)}°
                                            </td>

                                            <td>
                                                {Number(video.left_elbow_angle || 0).toFixed(1)}° / {Number(video.right_elbow_angle || 0).toFixed(1)}°
                                            </td>

                                            <td>{Number(video.posture_symmetry || 0).toFixed(1)}%</td>

                                            <td>{video.movement_quality}</td>

                                            <td>{video.injury_risk}</td>

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