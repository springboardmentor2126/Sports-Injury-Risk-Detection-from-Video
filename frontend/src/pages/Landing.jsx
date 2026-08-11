import { Link } from "react-router-dom";

export default function Landing() {
    return (
        <div
            style={{
                textAlign: "center",
                marginTop: "70px",
                padding: "20px",
            }}
        >
            <h1 style={{ fontSize: "40px" }}>
                🏃 Sports Injury Detection Platform
            </h1>

            <p
                style={{
                    fontSize: "20px",
                    color: "#555",
                    maxWidth: "700px",
                    margin: "20px auto",
                }}
            >
                AI-powered system for analyzing athlete movement,
                detecting biomechanical issues, and predicting injury risk
                before injuries occur.
            </p>

            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "20px",
                    marginTop: "40px",
                }}
            >
                <Link to="/login">
                    <button>Login</button>
                </Link>

                <Link to="/register">
                    <button>Create Account</button>
                </Link>
            </div>
        </div>
    );
}