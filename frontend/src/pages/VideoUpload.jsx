import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { UploadIllustration } from "../components/Illustrations";

const ACTIVITIES = [
  "running", "jumping", "landing",
  "throwing", "cutting", "cricket", "sport_specific",
];

export default function VideoUpload() {
  const [searchParams] = useSearchParams();
  const [athletes, setAthletes] = useState([]);
  const [athleteId, setAthleteId] = useState(searchParams.get("athlete_id") || "");
  const [activity, setActivity] = useState("running");
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.listAthletes().then(setAthletes).catch((err) => setError(err.message));
  }, []);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!athleteId) return setError("Please select an athlete.");
    if (!file) return setError("Please choose a video file.");

    setUploading(true);
    try {
      const video = await api.uploadVideo(athleteId, activity, file);
      await api.processVideo(video.id);
      navigate(`/videos/${video.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Upload Movement Video</h2>
      </div>

      <div className="card upload-card">
        <UploadIllustration className="upload-illustration" />
        <form onSubmit={handleSubmit}>
          {error && <p className="error">{error}</p>}

          <label>Athlete</label>
          <select value={athleteId} onChange={(e) => setAthleteId(e.target.value)} required>
            <option value="">Select athlete...</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>{a.athlete_code} — {a.sport_type}</option>
            ))}
          </select>

          <label>Activity Type</label>
          <select value={activity} onChange={(e) => setActivity(e.target.value)}>
            {ACTIVITIES.map((a) => (
              <option key={a} value={a}>{a.replace("_", " ")}</option>
            ))}
          </select>

          <label>Video File</label>
          <div
            className={`dropzone ${dragOver ? "dropzone-active" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files[0]);
            }}
            onClick={() => document.getElementById("video-file-input").click()}
          >
            <input
              id="video-file-input"
              type="file"
              accept=".mp4,.mov,.avi,.webm,.mkv"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {file ? (
              <p><strong>{file.name}</strong> ({(file.size / (1024 * 1024)).toFixed(1)} MB)</p>
            ) : (
              <p>Drag & drop a video here, or click to browse<br />
                <span className="muted">MP4, MOV, AVI, WEBM, MKV — up to 200MB</span></p>
            )}
          </div>

          <button type="submit" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload & Analyze"}
          </button>
        </form>
      </div>
    </div>
  );
}
