import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "./Auth.css";

function Login() {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {

        e.preventDefault();

        setLoading(true);

        try {

            const response = await API.post(
                "/users/login",
                {
                    email: email.trim(),
                    password
                }
            );

            console.log(
                "Login Response:",
                response.data
            );

            const user = response.data.user;

            // Save COMPLETE user information
            localStorage.setItem(
                "user",
                JSON.stringify(user)
            );

            // We are not using JWT authentication here.
            localStorage.setItem(
                "isLoggedIn",
                "true"
            );

            console.log(
                "Logged in user:",
                user
            );

            alert("Login Successful");

            const role = (
                user.role || ""
            ).trim().toLowerCase();

            if (role === "coach") {

                navigate("/coach-dashboard");

            } else {

                navigate("/dashboard");

            }

        } catch (error) {

            console.error(
                "Login Error:",
                error
            );

            alert(
                error.response?.data?.detail ||
                "Login Failed"
            );

        } finally {

            setLoading(false);

        }
    };

    return (

        <div className="login-page">

            <div className="login-left">

                <h1>
                    Sports Injury
                    <br />
                    Risk Detection
                </h1>

                <p>
                    AI-powered sports injury prediction system
                    using computer vision and pose analysis.
                </p>

                <div className="feature-box">

                    <h3>⚡ AI Motion Analysis</h3>

                    <p>
                        Detect injury risk from athlete movement.
                    </p>

                </div>

                <div className="feature-box">

                    <h3>📊 Risk Prediction</h3>

                    <p>
                        Generate injury assessment reports.
                    </p>

                </div>

            </div>

            <div className="login-card">

                <h2>Welcome Back</h2>

                <p>Login to your account</p>

                <form onSubmit={handleLogin}>

                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) =>
                            setEmail(e.target.value)
                        }
                        required
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                        required
                    />

                    <button
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Logging in..."
                            : "Login"}
                    </button>

                </form>

                <p className="auth-link">

                    Don't have an account?

                    <span
                        onClick={() =>
                            navigate("/register")
                        }
                    >
                        Sign Up
                    </span>

                </p>

            </div>

        </div>
    );
}

export default Login;