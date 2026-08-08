import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import "../styles/auth.css";
 
function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
 
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
 
  const handleSubmit = async (e) => {
    e.preventDefault();
 
    if (!token) {
      alert("This reset link is missing its token - please use the link from your email.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Passwords don't match.");
      return;
    }
 
    setLoading(true);
    try {
      const res = await api.post("/reset-password", { token, new_password: newPassword });
      alert(res.data.message);
      navigate("/login");
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="auth-page">
      <div className="form-card">
        <h2>Reset Password</h2>
 
        {!token ? (
          <p style={{ color: "#DC2626" }}>
            This link is missing its reset token. Please use the link from your email, or{" "}
            <Link to="/forgot-password">request a new one</Link>.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>New Password</label>
              <input
                className="form-control"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
 
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                className="form-control"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
 
            <button className="btn" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
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
 
export default ResetPassword;
 