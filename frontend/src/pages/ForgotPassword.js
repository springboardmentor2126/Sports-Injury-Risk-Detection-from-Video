import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import "../styles/auth.css";
 
function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/forgot-password", { email });
      alert(res.data.message);
      setSubmitted(true);
    } catch (error) {
      alert(error.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="auth-page">
      <div className="form-card">
        <h2>Forgot Password</h2>
 
        {submitted ? (
          <p style={{ color: "#64748B" }}>
            If that email is registered, a reset link has been sent to it. Check your inbox
            (and spam folder) - the link expires in 30 minutes.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                className="form-control"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
 
            <button className="btn" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}
 
        <p style={{ marginTop: "20px" }}>
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
 
export default ForgotPassword;
 