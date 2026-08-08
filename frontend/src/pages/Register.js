import { useState } from "react";
import api from "../api/api";
import { Link, useNavigate } from "react-router-dom";
import GoogleAuthButton from "../components/GoogleAuthButton";
import "../styles/auth.css";
 
function Register() {
  const navigate = useNavigate();
 
  const [user, setUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "Athlete"
  });
 
  const handleChange = (e) => {
 
    setUser({
      ...user,
      [e.target.name]: e.target.value
    });
 
  };
 
  const registerUser = async (e) => {
 
    e.preventDefault();
 
    try {
 
      const response = await api.post("/register", user);
 
      alert(response.data.message);
      navigate("/login");
 
      setUser({
        name: "",
        email: "",
        password: "",
        role: "Athlete"
      });
 
    } catch (error) {
 
      const errDetail = error.response?.data?.detail || "Registration Failed";
      alert(errDetail);
 
    }
 
  };
 
  return (
 
    <div className="auth-page">
 
      <div className="form-card">
 
        <h2>Create Account</h2>
 
        <form onSubmit={registerUser}>
 
          <div className="form-group">
 
            <label>Name</label>
 
            <input
              className="form-control"
              name="name"
              value={user.name}
              onChange={handleChange}
            />
 
          </div>
 
          <div className="form-group">
 
            <label>Email</label>
 
            <input
              className="form-control"
              type="email"
              name="email"
              value={user.email}
              onChange={handleChange}
            />
 
          </div>
 
          <div className="form-group">
 
            <label>Password</label>
 
            <input
              className="form-control"
              type="password"
              name="password"
              value={user.password}
              onChange={handleChange}
            />
 
          </div>
 
          <div className="form-group">
 
            <label>Role</label>
 
            <select
              className="form-control"
              name="role"
              value={user.role}
              onChange={handleChange}
            >
              <option>Athlete</option>
              <option>Coach</option>
              <option>Physiotherapist</option>
              <option>Sports Scientist</option>
            </select>
 
          </div>
 
          <button className="btn" style={{ width: "100%" }}>
            Register
          </button>
 
        </form>
 
        <GoogleAuthButton />
 
        <p style={{ marginTop: "20px" }}>
          Already have an account?
          <Link to="/login"> Login</Link>
        </p>
 
      </div>
 
    </div>
 
  );
 
}
 
export default Register;
 