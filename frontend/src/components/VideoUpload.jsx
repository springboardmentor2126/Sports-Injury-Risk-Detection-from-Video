import { useState } from "react";
import { uploadVideo, getBiomechanicsReport } from "../api/analysis";

function VideoUpload({ onReportReady }) {
  const [file, setFile] = useState(null);
  const [athleteId, setAthleteId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!file) {
      alert("Please select a video file first");
      return;
    }
    setLoading(true);
    setStatus("Uploading video and extracting frames…");
    try {
      const uploadResult = await uploadVideo(file);
      setStatus(`${uploadResult.frames_extracted} frames extracted. Running pose detection and biomechanical analysis…`);

      const report = await getBiomechanicsReport(uploadResult.video_filename, athleteId || undefined);
      setStatus("Analysis complete.");
      onReportReady(report);
    } catch (err) {
      setStatus("Error: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="font-display" style={{ fontSize: "16px", marginTop: 0, marginBottom: "6px" }}>
        Analyze Athlete Video
      </h2>
      <p style={{ fontSize: "13px", color: "var(--slate-500)", marginTop: 0, marginBottom: "20px" }}>
        Upload footage to run pose estimation, biomechanical scoring, and injury risk analysis.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "440px" }}>
        <label style={{
          border: "1.5px dashed var(--slate-200)",
          borderRadius: "8px",
          padding: "20px",
          textAlign: "center",
          cursor: "pointer",
          fontSize: "13px",
          color: "var(--slate-500)"
        }}>
          {file ? file.name : "Click to choose a video (.mp4, .mov, .avi)"}
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo"
            onChange={(e) => setFile(e.target.files[0])}
            style={{ display: "none" }}
          />
        </label>

        <input
          className="input"
          type="text"
          placeholder="Athlete ID (optional — links injury history & training load)"
          value={athleteId}
          onChange={(e) => setAthleteId(e.target.value)}
        />

        <button onClick={handleAnalyze} disabled={loading} className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
          {loading ? "Processing…" : "Upload & Analyze"}
        </button>

        {status && (
          <p className="font-mono" style={{ fontSize: "12px", color: "var(--blue-600)" }}>
            {status}
          </p>
        )}
      </div>
    </div>
  );
}

export default VideoUpload;