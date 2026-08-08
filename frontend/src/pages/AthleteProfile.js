import { useState, useEffect } from "react";
import api from "../api/api";
import "../styles/profile.css";
 
function AthleteProfile() {
 
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAthlete = currentUser.role === "Athlete";
 
  const [profile, setProfile] = useState({
    athlete_id: "",
    sport_type: "",
    position: "",
    age: "",
    height: "",
    weight: "",
    injury_history: "",
    training_load: ""
  });
  const [loading, setLoading] = useState(isAthlete);
 
  // Athletes already have exactly one profile, auto-created at registration
  // - load it so this page becomes an EDIT form, not a blank create form.
  // Everyone else (Coach/Physio/Sports Scientist/Admin) keeps the original
  // create-a-new-athlete behavior below.
  useEffect(() => {
    if (!isAthlete) return;
 
    const loadOwnProfile = async () => {
      try {
        const res = await api.get("/athlete-profiles");
        const own = (res.data.profiles || []).find((p) => p.is_owner);
        if (own) {
          setProfile({
            athlete_id: own.athlete_id,
            sport_type: own.sport_type || "",
            position: own.position || "",
            age: own.age || "",
            height: own.height || "",
            weight: own.weight || "",
            injury_history: own.injury_history || "",
            training_load: own.training_load || "",
          });
        }
      } catch (error) {
        console.error("Error loading your profile:", error);
      } finally {
        setLoading(false);
      }
    };
 
    loadOwnProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 
  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };
 
  const saveProfile = async (e) => {
    e.preventDefault();
 
    if (!isAthlete && (!profile.athlete_id || !profile.sport_type)) {
      alert("Please fill in Athlete ID and Sport Type");
      return;
    }
 
    try {
      if (isAthlete) {
        // Update, not create - athletes never create additional profiles.
        const res = await api.put(`/athlete-profile/${encodeURIComponent(profile.athlete_id)}`, profile);
        alert(res.data.message);
      } else {
        const res = await api.post("/athlete-profile", profile);
        alert(res.data.message);
        // Clear form after successful create (coaches may add several).
        setProfile({
          athlete_id: "",
          sport_type: "",
          position: "",
          age: "",
          height: "",
          weight: "",
          injury_history: "",
          training_load: ""
        });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Profile Save Failed";
      alert(`Error: ${errorMessage}`);
      console.error("Save error:", error);
    }
  };
 
  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }
 
  return (
 
    <div className="page">
 
      <div className="container">
 
        <div className="form-card profile-card">
 
          <h2>{isAthlete ? "My Profile" : "Athlete Profile"}</h2>
 
          <form onSubmit={saveProfile} className="profile-grid">
 
            <input
              className="form-control"
              placeholder="Athlete ID"
              name="athlete_id"
              value={profile.athlete_id}
              onChange={handleChange}
              readOnly={isAthlete}
              style={isAthlete ? { background: "#F1F5F9", cursor: "not-allowed" } : undefined}
              title={isAthlete ? "Your athlete ID is assigned automatically and can't be changed" : undefined}
            />
            <input className="form-control" placeholder="Sport Type" name="sport_type" value={profile.sport_type} onChange={handleChange}/>
            <input className="form-control" placeholder="Position" name="position" value={profile.position} onChange={handleChange}/>
            <input className="form-control" placeholder="Age" name="age" value={profile.age} onChange={handleChange}/>
            <input className="form-control" placeholder="Height" name="height" value={profile.height} onChange={handleChange}/>
            <input className="form-control" placeholder="Weight" name="weight" value={profile.weight} onChange={handleChange}/>
 
            <textarea
              className="form-control"
              placeholder="Injury History"
              name="injury_history"
              rows="4"
              value={profile.injury_history}
              onChange={handleChange}
            />
 
            <textarea
              className="form-control"
              placeholder="Training Load"
              name="training_load"
              rows="4"
              value={profile.training_load}
              onChange={handleChange}
            />
 
            <button className="btn profile-btn">
              {isAthlete ? "Update Profile" : "Save Profile"}
            </button>
 
          </form>
 
        </div>
 
      </div>
 
    </div>
 
  );
 
}
 
export default AthleteProfile;
 