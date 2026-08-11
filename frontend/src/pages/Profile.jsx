import { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/profile.css";

export default function Profile() {

    const [user, setUser] = useState({
        username: "",
        email: "",
        age: "",
        gender: "",
        height: "",
        weight: "",
        sport: "",
        experience: ""
    });

    const [message, setMessage] = useState("");

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {

        const token = localStorage.getItem("token");

        try {

            const response = await api.get("/auth/me", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setUser(response.data);

        } catch (error) {

            console.log(error);

        }
    }

    function handleChange(e) {

        setUser({
            ...user,
            [e.target.name]: e.target.value
        });

    }

    async function saveProfile() {

        const token = localStorage.getItem("token");

        try {

            await api.put(
                "/auth/profile",
                {
                    age: Number(user.age),
                    gender: user.gender,
                    height: Number(user.height),
                    weight: Number(user.weight),
                    sport: user.sport,
                    experience: Number(user.experience)
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setMessage("✅ Profile updated successfully.");

        }

        catch (error) {

            console.log(error);

            setMessage("❌ Failed to update profile.");

        }

    }

    return (

        <div className="profile-page">

            <div className="profile-card">

                <div className="profile-header">

                    <div className="profile-avatar">

                        {user.username
                            ? user.username.charAt(0).toUpperCase()
                            : "A"}

                    </div>

                    <div>

                        <h2>{user.username}</h2>

                        <p>{user.email}</p>

                    </div>

                </div>

                <div className="profile-form">

                    <label>Age</label>

                    <input
                        type="number"
                        name="age"
                        value={user.age || ""}
                        onChange={handleChange}
                    />

                    <label>Gender</label>

                    <select
                        name="gender"
                        value={user.gender || ""}
                        onChange={handleChange}
                    >

                        <option value="">Select</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>

                    </select>

                    <label>Height (cm)</label>

                    <input
                        type="number"
                        name="height"
                        value={user.height || ""}
                        onChange={handleChange}
                    />

                    <label>Weight (kg)</label>

                    <input
                        type="number"
                        name="weight"
                        value={user.weight || ""}
                        onChange={handleChange}
                    />

                    <label>Sport</label>

                    <input
                        type="text"
                        name="sport"
                        value={user.sport || ""}
                        onChange={handleChange}
                    />

                    <label>Experience (Years)</label>

                    <input
                        type="number"
                        name="experience"
                        value={user.experience || ""}
                        onChange={handleChange}
                    />

                </div>

                <button
                    className="edit-btn"
                    onClick={saveProfile}
                >
                    Save Profile
                </button>

                {message &&

                    <p
                        style={{
                            marginTop: "20px",
                            textAlign: "center",
                            color: "#1b8f3f",
                            fontWeight: "600"
                        }}
                    >
                        {message}
                    </p>

                }

            </div>

        </div>

    );

}