import React from "react";
import { Link } from "react-router-dom";
import { Activity, Video, ShieldCheck, LineChart } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { HeroIllustration, WaveformTrace } from "../components/Illustrations";

const FEATURES = [
  {
    icon: Video,
    tag: "INPUT",
    title: "Video Upload & Processing",
    desc: "Upload athlete movement clips — running, jumping, landing, cutting — for automatic analysis.",
  },
  {
    icon: Activity,
    tag: "ENGINE",
    title: "Pose Estimation",
    desc: "MediaPipe-powered skeleton tracking extracts joint keypoints frame by frame.",
  },
  {
    icon: LineChart,
    tag: "METRIC · KNEE VALGUS, HIP STABILITY",
    title: "Biomechanical Analysis",
    desc: "Knee angles, valgus, hip stability, trunk lean, landing mechanics, and symmetry — scored automatically.",
  },
  {
    icon: ShieldCheck,
    tag: "OUTPUT",
    title: "Movement Quality Score",
    desc: "A single 0–100 score and risk category (Low → Critical) summarizing injury-relevant movement patterns.",
  },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="page fade-in">
      <div className="hero-panel">
        <WaveformTrace className="hero-waveform" />
        <div className="hero-content">
          <div className="hero-text">
            <span className="eyebrow">Sports Injury Intelligence</span>
            <h1>See the injury before it happens.</h1>
            <p>
              Upload athlete movement video. The platform tracks joint keypoints,
              measures biomechanical load, and scores injury risk — turning raw
              footage into a readout a coach or physio can act on.
            </p>
            {user ? (
              <>
                <p className="muted">Welcome back, <strong>{user.full_name}</strong> — {user.role.replace("_", " ")}</p>
                <div className="hero-actions">
                  <Link className="btn" to="/athletes">Athlete Profiles</Link>
                  <Link className="btn btn-secondary" to="/videos">Movement Videos</Link>
                </div>
              </>
            ) : (
              <Link className="btn" to="/login">Login to get started</Link>
            )}
          </div>
          <HeroIllustration className="hero-illustration" />
        </div>
      </div>

      <div className="feature-grid">
        {FEATURES.map(({ icon: Icon, title, desc, tag }, i) => (
          <div className="feature-card fade-in-up" style={{ animationDelay: `${i * 90}ms` }} key={title}>
            <div className="feature-card-top">
              <div className="feature-icon"><Icon size={20} strokeWidth={2} /></div>
              <span className="feature-tag">{tag}</span>
            </div>
            <h4>{title}</h4>
            <p>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
