import { Link } from "react-router-dom";
import { FaPlayCircle, FaHeartbeat } from "react-icons/fa";

function Hero() {
  return (
    <section className="hero">

      <div className="container hero-container">

        <div className="hero-left">

          <span className="hero-badge">
            <FaHeartbeat /> AI Powered Sports Analytics
          </span>

          <h1>
            Prevent Sports Injuries
            <br />
            Before They Happen.
          </h1>

          <p>
            Upload athlete videos, analyze body posture using AI-powered pose
            estimation, monitor movement patterns, and detect injury risks
            before they become serious.
          </p>

          <div className="hero-buttons">

            <Link to="/register" className="btn">
              Get Started
            </Link>

            <Link to="/dashboard" className="btn-outline">
              <FaPlayCircle /> Live Demo
            </Link>

          </div>

        </div>

        <div className="hero-right">

          <div className="hero-card">

            <div className="hero-circle"></div>

            <h3>Sports Injury AI</h3>

            <p>Real-time posture analysis using Computer Vision & AI</p>

            <div className="hero-stats">

              <div>
                <h2>98%</h2>
                <span>Detection</span>
              </div>

              <div>
                <h2>24/7</h2>
                <span>Monitoring</span>
              </div>

              <div>
                <h2>AI</h2>
                <span>Powered</span>
              </div>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}

export default Hero;