import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
 
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
 
function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.getElementById("google-identity-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.id = "google-identity-script";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity script"));
    document.body.appendChild(script);
  });
}
 
/**
 * Self-contained Google Sign-In button. Dynamically loads Google's script
 * (no index.html changes needed). Requires REACT_APP_GOOGLE_CLIENT_ID to be
 * set in frontend/.env - renders nothing if it's missing, rather than
 * erroring, so the rest of the login/register page still works fine
 * without it configured.
 */
function GoogleAuthButton() {
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  const [pendingSignup, setPendingSignup] = useState(null); // {credential, email, name}
  const [selectedRole, setSelectedRole] = useState("Athlete");
 
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn("REACT_APP_GOOGLE_CLIENT_ID is not set - Google Sign-In button will not render.");
      return;
    }
 
    let cancelled = false;
 
    loadGoogleScript().then(() => {
      if (cancelled || !window.google?.accounts?.id) return;
 
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
 
      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          width: 280,
        });
      }
    });
 
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 
  const handleCredentialResponse = async (response) => {
    const credential = response.credential;
    try {
      const res = await api.post("/auth/google", { credential });
 
      if (res.data.is_new_user) {
        // Google doesn't know which role this person should have - hold
        // onto the credential and ask, then finish signup separately.
        setPendingSignup({ credential, email: res.data.email, name: res.data.name });
      } else {
        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        navigate("/dashboard");
      }
    } catch (error) {
      alert(error.response?.data?.detail || "Google Sign-In failed.");
    }
  };
 
  const completeSignup = async () => {
    try {
      const res = await api.post("/auth/google/complete-signup", {
        credential: pendingSignup.credential,
        role: selectedRole,
      });
      localStorage.setItem("access_token", res.data.access_token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      alert(res.data.message);
      navigate("/dashboard");
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to complete sign-up.");
    }
  };
 
  if (!GOOGLE_CLIENT_ID) return null;
 
  return (
    <div style={{ marginTop: "16px" }}>
      <div style={{ textAlign: "center", color: "#94A3B8", fontSize: "13px", margin: "12px 0" }}>OR</div>
      <div ref={buttonRef}></div>
 
      {pendingSignup && (
        <div className="modal-overlay" onClick={() => setPendingSignup(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
            <button className="modal-close" onClick={() => setPendingSignup(null)}>✕</button>
            <h3>Almost done, {pendingSignup.name}</h3>
            <p style={{ color: "#64748B" }}>Choose your role to finish creating your account:</p>
            <select
              className="form-control"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option>Athlete</option>
              <option>Coach</option>
              <option>Physiotherapist</option>
              <option>Sports Scientist</option>
            </select>
            <button className="btn" style={{ width: "100%", marginTop: "12px" }} onClick={completeSignup}>
              Create Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
 
export default GoogleAuthButton;
 