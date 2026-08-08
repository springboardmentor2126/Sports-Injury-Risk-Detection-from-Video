import { useState } from "react";
import api from "../api/api";
import { Link, useNavigate } from "react-router-dom";
import GoogleAuthButton from "../components/GoogleAuthButton";
import "../styles/auth.css";
 
function Login() {
 
  const navigate = useNavigate();
 
  const [user, setUser] = useState({
    email: "",
    password: ""
  });
 
  const handleChange = (e) => {
    setUser({
      ...user,
      [e.target.name]: e.target.value
    });
  };
 
  const loginUser = async (e) => {
 
    e.preventDefault();
 
    try {
 
      const response = await api.post("/login", user);
 
      // IMPORTANT: the backend returns "access_token", not "token" - this
      // key must match exactly what api.js's request interceptor reads
      // (localStorage.getItem("access_token")), or every subsequent request
      // silently goes out with no auth header at all.
      localStorage.setItem("access_token", response.data.access_token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
 
      alert(response.data.message);
      navigate("/dashboard");
 
    } catch (error) {
 
      const errDetail = error.response?.data?.detail || "Login Failed";
      alert(errDetail);
 
    }
 
  };
 
  return (
 
    <div className="auth-page">
 
      <div className="form-card">
 
        <h2>Login</h2>
 
        <form onSubmit={loginUser}>
 
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
 
          <button className="btn" style={{ width: "100%" }}>
            Login
          </button>
 
        </form>
 
        <p style={{ marginTop: "12px", textAlign: "right" }}>
          <Link to="/forgot-password">Forgot Password?</Link>
        </p>
 
        <GoogleAuthButton />
 
        <p style={{ marginTop: "20px" }}>
          Don't have an account?
          <Link to="/register"> Register</Link>
        </p>
 
      </div>
 
    </div>
 
  );
 
}
 
export default Login;
 