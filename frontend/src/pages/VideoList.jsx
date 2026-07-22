import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { EmptyIllustration } from "../components/Illustrations";

const STATUS_STYLES = {
  uploaded: { label: "Uploaded", cls: "badge-neutral" },
  processing: { label: "Processing...", cls: "badge-processing" },
  completed: { label: "Completed", cls: "badge-success" },
  failed: { label: "Failed", cls: "badge-danger" },
};

export default function VideoList() {
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await api.listVideos();
      setVideos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Poll every 4s in case something is still processing — keeps status badges live.
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Movement Videos</h2>
        <Link className="btn" to="/videos/upload">+ Upload Video</Link>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : videos.length === 0 ? (
        <div className="card empty-state">
          <EmptyIllustration className="empty-illustration" />
          <p>No videos uploaded yet.</p>
          <Link className="btn" to="/videos/upload">Upload your first video</Link>
        </div>
      ) : (
        <div className="video-grid">
          {videos.map((v) => (
            <Link to={`/videos/${v.id}`} key={v.id} className="video-card">
              <div className="video-card-thumb">
                <span className="video-card-activity">{v.activity_type.replace("_", " ")}</span>
              </div>
              <div className="video-card-body">
                <p className="video-card-name">{v.filename}</p>
                <span className={`badge ${STATUS_STYLES[v.status]?.cls || "badge-neutral"}`}>
                  {STATUS_STYLES[v.status]?.label || v.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
