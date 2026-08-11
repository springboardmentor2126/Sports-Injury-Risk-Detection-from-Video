import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

export default function Login() {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    async function handleLogin(e) {

        e.preventDefault();

        try {

            const response = await api.post("/auth/login", {
                email,
                password
            });

            localStorage.setItem(
                "token",
                response.data.access_token
            );

            localStorage.setItem(
                "role",
                response.data.role
            );

            switch (response.data.role) {

                case "Athlete":
                    navigate("/dashboard");
                    break;

                case "Coach":
                    navigate("/coach");
                    break;

                case "Physiotherapist":
                    navigate("/physio");
                    break;

                case "Sports Scientist":
                    navigate("/scientist");
                    break;

                case "Admin":
                    navigate("/admin");
                    break;

                default:
                    navigate("/dashboard");

            }

        }

        catch (err) {

            alert("Invalid Email or Password");

        }

    }

    return (

        <div className="form-container">

            <h2>Login</h2>

            <form onSubmit={handleLogin}>

                <input
                    type="email"
                    placeholder="Email"
                    onChange={(e)=>setEmail(e.target.value)}
                    required
                />

                <input
                    type="password"
                    placeholder="Password"
                    onChange={(e)=>setPassword(e.target.value)}
                    required
                />

                <button type="submit">

                    Login

                </button>

            </form>

            <p style={{marginTop:"20px"}}>

                Don't have an account?

                <Link to="/register">

                    {" "}Register

                </Link>

            </p>

        </div>

    );

}