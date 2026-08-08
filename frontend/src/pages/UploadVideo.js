import { useState, useEffect } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { FaCloudUploadAlt, FaCircleNotch, FaUserCircle } from "react-icons/fa";
import "../styles/upload.css";
 
function UploadVideo() {
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [loading, setLoading] = useState(false);
 
  // Fetch profiles on mount so the video can be associated with an athlete -
  // this matters because the injury risk engine uses the athlete's
  // injury_history and training_load to weight the risk score, AND because
  // the backend now requires an athlete_id to determine who owns this
  // video/analysis (multi-user isolation - see note on uploadVideo below).
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const res = await api.get("/athlete-profiles");
        setProfiles(res.data.profiles || []);
        if (res.data.profiles && res.data.profiles.length > 0) {
          setSelectedAthleteId(res.data.profiles[0].athlete_id);
        }
      } catch (error) {
        console.error("Error fetching athlete profiles:", error);
      }
    };
    fetchProfiles();
  }, []);
 
  const uploadVideo = async (e) => {
    e.preventDefault();
    if (!video) {
      alert("Please select a video file first");
      return;
    }
 
    // CHANGED: athlete selection is no longer optional. The backend requires
    // athlete_id on every upload so it can verify the athlete belongs to the
    // logged-in user before processing - without this, there's no way to
    // determine who owns the resulting video/analysis/report.
    if (!selectedAthleteId) {
      alert("Please select or create an athlete profile first");
      return;
    }
 
    const selectedProfile = profiles.find((p) => p.athlete_id === selectedAthleteId);
    const athleteName = selectedProfile ? selectedProfile.athlete_id : "Athlete";
 
    const data = new FormData();
    data.append("video", video);
    data.append("athlete_name", athleteName);
    data.append("athlete_id", selectedAthleteId);
 
    setLoading(true);
 
    try {
      const res = await api.post("/upload-video", data);
      setLoading(false);
      navigate(`/results?analysis_id=${encodeURIComponent(res.data.analysis_id)}`);
    } catch (error) {
      setLoading(false);
      const errDetail = error.response?.data?.detail || "Video Processing Failed";
      alert(`Error: ${errDetail}`);
    }
  };
 
  return (
    <div className="page">
      <div className="container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <div className="upload-card">
          <h2>Upload Sports Video</h2>
          <p style={{ color: "#64748B", margin: "10px 0 30px" }}>
            Upload athlete movement videos to run the pose-tracking and injury-risk assessment pipeline.
          </p>
 
          {loading ? (
            <div className="upload-loader">
              <FaCircleNotch className="spinner-icon" />
              <h3>AI Engine Processing... this can take a minute for longer videos.</h3>
            </div>
          ) : (
            <form onSubmit={uploadVideo}>
              <div className="athlete-select-group">
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", marginBottom: "8px" }}>
                  <FaUserCircle /> Select Athlete Profile
                </label>
                {profiles.length === 0 ? (
                  <div className="no-profiles-warning">
                    No athlete profiles created yet. Please create one in the{" "}
                    <a href="/athlete-profile" style={{ color: "#2563EB", fontWeight: "600" }}>Profile Page</a> first.
                  </div>
                ) : (
                  <select
                    className="form-control"
                    value={selectedAthleteId}
                    onChange={(e) => setSelectedAthleteId(e.target.value)}
                  >
                    {profiles.map((p) => (
                      <option key={p.athlete_id} value={p.athlete_id}>
                        {p.athlete_id} ({p.sport_type} - {p.position})
                      </option>
                    ))}
                  </select>
                )}
              </div>
 
              <div className="dropzone">
                <input
                  id="video-file-input"
                  type="file"
                  accept=".mp4,.avi,.mov"
                  onChange={(e) => setVideo(e.target.files[0])}
                  style={{ display: "none" }}
                />
                <label htmlFor="video-file-input" style={{ cursor: "pointer", width: "100%", height: "100%", display: "block", padding: "40px 20px" }}>
                  <FaCloudUploadAlt className="upload-icon" />
                  {video ? (
                    <div className="file-info">
                      <strong>Selected Video:</strong>
                      <p>{video.name}</p>
                      <span>{(video.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  ) : (
                    <div>
                      <p className="upload-text">Click to browse or drag a video here</p>
                      <span className="upload-subtitle">Supports MP4, AVI, MOV</span>
                    </div>
                  )}
                </label>
              </div>
 
              <button
                type="submit"
                className="btn upload-btn"
                disabled={!video || !selectedAthleteId}
                style={{ opacity: (!video || !selectedAthleteId) ? 0.6 : 1 }}
              >
                Start AI Pose Analysis
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
 
export default UploadVideo;