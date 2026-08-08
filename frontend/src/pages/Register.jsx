import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "./Auth.css";

function Register() {
    const navigate = useNavigate();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("Athlete");

    const [age, setAge] = useState("");
    const [height, setHeight] = useState("");
    const [weight, setWeight] = useState("");
    const [sport, setSport] = useState("");
    const [experience, setExperience] = useState("");

    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();

        if (
            !fullName ||
            !email ||
            !password ||
            !role ||
            !age ||
            !height ||
            !weight ||
            !sport ||
            !experience
        ) {
            alert("Please fill all fields.");
            return;
        }

        try {
            setLoading(true);

            const response = await API.post("/users/register", {
                full_name: fullName,
                email: email,
                password: password,
                role: role,

                age: Number(age),
                height: Number(height),
                weight: Number(weight),
                sport: sport,
                experience: Number(experience),
            });

            console.log("Registration Response:", response.data);

            alert("Registration successful! Please login.");

            navigate("/");
        } catch (error) {
            console.error("Registration Error:", error);

            const message =
                error.response?.data?.detail ||
                "Registration failed. Please try again.";

            alert(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">

            {/* LEFT SECTION */}
            <div className="login-left">

                <h1>
                    Sports Injury
                    <br />
                    Risk Detection
                </h1>

                <p>
                    AI-powered sports injury prediction system using
                    computer vision and pose analysis.
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

            {/* REGISTER CARD */}
            <div className="login-card">

                <h2>Create Account</h2>

                <p>Register your account</p>

                <form onSubmit={handleRegister}>

                    {/* FULL NAME */}
                    <input
                        type="text"
                        placeholder="Full Name"
                        value={fullName}
                        onChange={(e) =>
                            setFullName(e.target.value)
                        }
                        required
                    />

                    {/* EMAIL */}
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) =>
                            setEmail(e.target.value)
                        }
                        required
                    />

                    {/* PASSWORD */}
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                        required
                    />

                    {/* ROLE */}
                    <select
                        value={role}
                        onChange={(e) =>
                            setRole(e.target.value)
                        }
                        required
                    >
                        <option value="Athlete">
                            Athlete
                        </option>

                        <option value="Coach">
                            Coach
                        </option>
                    </select>

                    {/* AGE */}
                    <input
                        type="number"
                        placeholder="Age"
                        min="1"
                        value={age}
                        onChange={(e) =>
                            setAge(e.target.value)
                        }
                        required
                    />

                    {/* HEIGHT */}
                    <input
                        type="number"
                        placeholder="Height (cm)"
                        min="1"
                        step="0.1"
                        value={height}
                        onChange={(e) =>
                            setHeight(e.target.value)
                        }
                        required
                    />

                    {/* WEIGHT */}
                    <input
                        type="number"
                        placeholder="Weight (kg)"
                        min="1"
                        step="0.1"
                        value={weight}
                        onChange={(e) =>
                            setWeight(e.target.value)
                        }
                        required
                    />

                    {/* SPORT */}
                    <input
                        type="text"
                        placeholder="Sport"
                        value={sport}
                        onChange={(e) =>
                            setSport(e.target.value)
                        }
                        required
                    />

                    {/* EXPERIENCE */}
                    <input
                        type="number"
                        placeholder="Experience (Years)"
                        min="0"
                        value={experience}
                        onChange={(e) =>
                            setExperience(e.target.value)
                        }
                        required
                    />

                    <button
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Creating Account..."
                            : "Sign Up"}
                    </button>

                </form>

                <p className="auth-link">

                    Already have an account?

                    <span
                        onClick={() => navigate("/")}
                    >
                        Login
                    </span>

                </p>

            </div>

        </div>
    );
}

export default Register;