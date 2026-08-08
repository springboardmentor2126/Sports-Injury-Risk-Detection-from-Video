import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import MainLayout from "../components/MainLayout";
import "./AthleteProfile.css";

function AthleteProfile() {
    const navigate = useNavigate();

    const emptyProfile = {
        full_name: "",
        email: "",
        role: "",
        id: "",
        age: "",
        height: "",
        weight: "",
        sport: "",
        experience: ""
    };

    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(emptyProfile);

    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // =====================================================
    // LOAD LOGGED-IN USER
    // =====================================================

    useEffect(() => {
        const storedUser = localStorage.getItem("user");

        if (!storedUser || storedUser === "undefined" || storedUser === "null") {
            setError("Please login first.");
            setLoading(false);
            return;
        }

        try {
            const parsedUser = JSON.parse(storedUser);

            if (!parsedUser || !parsedUser.id) {
                setError("Invalid login information. Please login again.");
                setLoading(false);
                return;
            }

            console.log("Logged-in user:", parsedUser);

            setUser(parsedUser);

            setProfile({
                full_name: parsedUser.full_name || "",
                email: parsedUser.email || "",
                role: parsedUser.role || "",
                id: parsedUser.id || "",
                age: parsedUser.age ?? "",
                height: parsedUser.height ?? "",
                weight: parsedUser.weight ?? "",
                sport: parsedUser.sport || "",
                experience: parsedUser.experience ?? ""
            });

            setLoading(false);

        } catch (err) {
            console.error("User data error:", err);

            localStorage.removeItem("user");

            setError("Invalid login information. Please login again.");
            setLoading(false);
        }
    }, []);

    // =====================================================
    // HANDLE INPUT CHANGE
    // =====================================================

    const handleChange = (e) => {
        const { name, value } = e.target;

        setProfile((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    // =====================================================
    // EDIT PROFILE
    // =====================================================

    const handleEdit = () => {
        setError("");
        setIsEditing(true);
    };

    // =====================================================
    // CANCEL EDIT
    // =====================================================

    const handleCancel = () => {
        if (!user) return;

        setProfile({
            full_name: user.full_name || "",
            email: user.email || "",
            role: user.role || "",
            id: user.id || "",
            age: user.age ?? "",
            height: user.height ?? "",
            weight: user.weight ?? "",
            sport: user.sport || "",
            experience: user.experience ?? ""
        });

        setError("");
        setIsEditing(false);
    };

    // =====================================================
    // SAVE PROFILE
    // =====================================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user || !user.id) {
            setError("User information not found. Please login again.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const updatedData = {
                full_name: profile.full_name.trim(),
                age: Number(profile.age),
                height: Number(profile.height),
                weight: Number(profile.weight),
                sport: profile.sport.trim(),
                experience: Number(profile.experience)
            };

            console.log("Updating user:", user.id);
            console.log("Update data:", updatedData);

            const response = await API.put(
                `/users/${user.id}`,
                updatedData
            );

            console.log("Update response:", response.data);

            /*
             * Backend should return:
             *
             * {
             *   message: "...",
             *   user: {...}
             * }
             */

            const updatedUser =
                response.data?.user || {
                    ...user,
                    ...updatedData
                };

            // Keep ID/email/role if backend doesn't return them
            const finalUser = {
                ...user,
                ...updatedUser,
                id: updatedUser.id || user.id,
                email: updatedUser.email || user.email,
                role: updatedUser.role || user.role
            };

            // Save updated user in browser
            localStorage.setItem(
                "user",
                JSON.stringify(finalUser)
            );

            // Update React state
            setUser(finalUser);

            setProfile({
                full_name: finalUser.full_name || "",
                email: finalUser.email || "",
                role: finalUser.role || "",
                id: finalUser.id || "",
                age: finalUser.age ?? "",
                height: finalUser.height ?? "",
                weight: finalUser.weight ?? "",
                sport: finalUser.sport || "",
                experience: finalUser.experience ?? ""
            });

            setIsEditing(false);

            alert(
                response.data?.message ||
                "Profile updated successfully."
            );

        } catch (error) {
            console.error("Profile update error:", error);

            setError(
                error.response?.data?.detail ||
                "Profile update failed."
            );

        } finally {
            setSaving(false);
        }
    };

    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {
        return (
            <MainLayout>
                <div className="athlete-profile-page">
                    <div className="profile-loading">
                        Loading profile...
                    </div>
                </div>
            </MainLayout>
        );
    }

    // =====================================================
    // NOT LOGGED IN
    // =====================================================

    if (!user) {
        return (
            <MainLayout>
                <div className="athlete-profile-page">

                    <div className="profile-header">
                        <div>
                            <h1>Athlete Profile</h1>
                            <p>
                                Manage your personal and sports information.
                            </p>
                        </div>
                    </div>

                    <div className="profile-error">
                        {error || "Please login first."}
                    </div>

                    <div className="profile-card">
                        <h2>Login Required</h2>

                        <p>
                            Please login to view your profile information.
                        </p>

                        <button
                            type="button"
                            className="edit-profile-btn"
                            onClick={() => navigate("/")}
                        >
                            Go to Login
                        </button>
                    </div>

                </div>
            </MainLayout>
        );
    }

    // =====================================================
    // PAGE
    // =====================================================

    return (
        <MainLayout>

            <div className="athlete-profile-page">

                {/* =========================
                    HEADER
                ========================== */}

                <div className="profile-header">

                    <div>
                        <h1>Athlete Profile</h1>

                        <p>
                            Manage your personal and sports information.
                        </p>
                    </div>

                    {!isEditing && (
                        <button
                            type="button"
                            className="edit-profile-btn"
                            onClick={handleEdit}
                        >
                            Edit Profile
                        </button>
                    )}

                </div>

                {/* =========================
                    ERROR
                ========================== */}

                {error && (
                    <div className="profile-error">
                        {error}
                    </div>
                )}

                {/* =================================================
                    EDIT MODE
                ================================================= */}

                {isEditing ? (

                    <div className="profile-card">

                        <div className="profile-card-header">

                            <h2>
                                Edit Profile
                            </h2>

                            <p>
                                Update your personal and sports information.
                            </p>

                        </div>

                        <form
                            className="profile-form"
                            onSubmit={handleSubmit}
                        >

                            <div className="form-grid">

                                {/* Full Name */}

                                <div className="profile-field">

                                    <label>
                                        Full Name
                                    </label>

                                    <input
                                        type="text"
                                        name="full_name"
                                        value={profile.full_name}
                                        onChange={handleChange}
                                        required
                                    />

                                </div>

                                {/* Email */}

                                <div className="profile-field">

                                    <label>
                                        Email
                                    </label>

                                    <input
                                        type="email"
                                        value={profile.email}
                                        disabled
                                    />

                                </div>

                                {/* Role */}

                                <div className="profile-field">

                                    <label>
                                        Role
                                    </label>

                                    <input
                                        type="text"
                                        value={profile.role}
                                        disabled
                                    />

                                </div>

                                {/* Age */}

                                <div className="profile-field">

                                    <label>
                                        Age
                                    </label>

                                    <input
                                        type="number"
                                        name="age"
                                        value={profile.age}
                                        onChange={handleChange}
                                        min="1"
                                        max="100"
                                        required
                                    />

                                </div>

                                {/* Height */}

                                <div className="profile-field">

                                    <label>
                                        Height (cm)
                                    </label>

                                    <input
                                        type="number"
                                        name="height"
                                        value={profile.height}
                                        onChange={handleChange}
                                        min="1"
                                        required
                                    />

                                </div>

                                {/* Weight */}

                                <div className="profile-field">

                                    <label>
                                        Weight (kg)
                                    </label>

                                    <input
                                        type="number"
                                        name="weight"
                                        value={profile.weight}
                                        onChange={handleChange}
                                        min="1"
                                        required
                                    />

                                </div>

                                {/* Sport */}

                                <div className="profile-field">

                                    <label>
                                        Sport
                                    </label>

                                    <input
                                        type="text"
                                        name="sport"
                                        value={profile.sport}
                                        onChange={handleChange}
                                        required
                                    />

                                </div>

                                {/* Experience */}

                                <div className="profile-field">

                                    <label>
                                        Experience (Years)
                                    </label>

                                    <input
                                        type="number"
                                        name="experience"
                                        value={profile.experience}
                                        onChange={handleChange}
                                        min="0"
                                        required
                                    />

                                </div>

                            </div>

                            <div className="profile-actions">

                                <button
                                    type="submit"
                                    className="save-profile-btn"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : "Save Changes"}
                                </button>

                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={handleCancel}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                            </div>

                        </form>

                    </div>

                ) : (

                    /* =================================================
                       VIEW MODE
                    ================================================= */

                    <div className="profile-card">

                        {/* =========================
                            ACCOUNT INFORMATION
                        ========================== */}

                        <div className="profile-card-header">

                            <h2>
                                Account Information
                            </h2>

                            <p>
                                Details from your registered account.
                            </p>

                        </div>

                        <div className="profile-details">

                            <div className="detail-item">
                                <span className="detail-label">
                                    Full Name
                                </span>

                                <span className="detail-value">
                                    {profile.full_name || "Not provided"}
                                </span>
                            </div>

                            <div className="detail-item">
                                <span className="detail-label">
                                    Email
                                </span>

                                <span className="detail-value">
                                    {profile.email || "Not provided"}
                                </span>
                            </div>

                            <div className="detail-item">
                                <span className="detail-label">
                                    Role
                                </span>

                                <span className="detail-value">
                                    {profile.role || "Not provided"}
                                </span>
                            </div>

                            <div className="detail-item">
                                <span className="detail-label">
                                    User ID
                                </span>

                                <span className="detail-value">
                                    {profile.id || "Not provided"}
                                </span>
                            </div>

                        </div>

                        {/* =========================
                            PERSONAL INFORMATION
                        ========================== */}

                        <div
                            className="profile-card-header"
                            style={{ marginTop: "35px" }}
                        >

                            <h2>
                                Personal Information
                            </h2>

                            <p>
                                Information entered during registration.
                            </p>

                        </div>

                        <div className="profile-details">

                            <div className="detail-item">

                                <span className="detail-label">
                                    Age
                                </span>

                                <span className="detail-value">
                                    {profile.age !== "" &&
                                    profile.age !== null
                                        ? `${profile.age} years`
                                        : "Not provided"}
                                </span>

                            </div>

                            <div className="detail-item">

                                <span className="detail-label">
                                    Height
                                </span>

                                <span className="detail-value">
                                    {profile.height !== "" &&
                                    profile.height !== null
                                        ? `${profile.height} cm`
                                        : "Not provided"}
                                </span>

                            </div>

                            <div className="detail-item">

                                <span className="detail-label">
                                    Weight
                                </span>

                                <span className="detail-value">
                                    {profile.weight !== "" &&
                                    profile.weight !== null
                                        ? `${profile.weight} kg`
                                        : "Not provided"}
                                </span>

                            </div>

                            <div className="detail-item">

                                <span className="detail-label">
                                    Sport
                                </span>

                                <span className="detail-value">
                                    {profile.sport || "Not provided"}
                                </span>

                            </div>

                            <div className="detail-item">

                                <span className="detail-label">
                                    Experience
                                </span>

                                <span className="detail-value">
                                    {profile.experience !== "" &&
                                    profile.experience !== null
                                        ? `${profile.experience} years`
                                        : "Not provided"}
                                </span>

                            </div>

                        </div>

                    </div>
                )}

            </div>

        </MainLayout>
    );
}

export default AthleteProfile;