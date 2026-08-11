import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Register() {

    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        email: "",
        password: "",
        role: "Athlete"
    });

    const [loading, setLoading] = useState(false);
    const [registered, setRegistered] = useState(false);

    function handleChange(e) {

        setForm({
            ...form,
            [e.target.name]: e.target.value
        });

    }

    async function handleRegister(e) {

        e.preventDefault();

        setLoading(true);

        try {

            await api.post("/auth/register", form);

            setRegistered(true);

        }

        catch (error) {

            console.log(error);

            if (error.response) {

                alert(error.response.data.detail);

            } else {

                alert("Unable to connect to server.");

            }

        }

        setLoading(false);

    }

    return (

        <div className="form-container">

            <h2>Create Account</h2>

            {

                registered ?

                    <>

                        <h3 style={{ color: "green" }}>
                            Registration Successful 🎉
                        </h3>

                        <p>
                            Your account has been created successfully.
                        </p>

                        <button
                            onClick={() => navigate("/login")}
                        >
                            Go to Login
                        </button>

                    </>

                    :

                    <form onSubmit={handleRegister}>

                        <input
                            type="text"
                            name="username"
                            placeholder="Username"
                            value={form.username}
                            onChange={handleChange}
                            required
                        />

                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={form.email}
                            onChange={handleChange}
                            required
                        />

                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />

                        <select
                            name="role"
                            value={form.role}
                            onChange={handleChange}
                        >

                            <option value="Athlete">
                                Athlete
                            </option>

                            <option value="Coach">
                                Coach
                            </option>

                            <option value="Physiotherapist">
                                Physiotherapist
                            </option>

                            <option value="Sports Scientist">
                                Sports Scientist
                            </option>

                        </select>

                        <button
                            type="submit"
                            disabled={loading}
                        >

                            {

                                loading ?

                                    "Registering..."

                                    :

                                    "Register"

                            }

                        </button>

                        <p
                            style={{
                                marginTop: "20px",
                                textAlign: "center"
                            }}
                        >

                            Already have an account?

                            <Link to="/login">

                                {" "}Login

                            </Link>

                        </p>

                    </form>

            }

        </div>

    );

}