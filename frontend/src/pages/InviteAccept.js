import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";

function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const isLoggedIn = !!localStorage.getItem("access_token");

    if (!isLoggedIn) {
      localStorage.setItem("pending_invite_token", token);
      navigate("/login");
      return;
    }

    const fetchInvite = async () => {
      try {
        const res = await api.get(`/invite/${encodeURIComponent(token)}`);
        setInvite(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "This invite link is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token, navigate]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await api.post(`/invite/${encodeURIComponent(token)}/accept`);
      localStorage.removeItem("pending_invite_token");
      setAccepted(true);
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to accept this invite.");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ padding: "60px 20px", textAlign: "center" }}>
          <p>Loading invite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ padding: "60px 20px", textAlign: "center", maxWidth: "480px", margin: "0 auto" }}>
        {error && (
          <>
            <h3>Invite Link Problem</h3>
            <p style={{ color: "#DC2626" }}>{error}</p>
          </>
        )}

        {!error && accepted && (
          <>
            <h3 style={{ color: "#22C55E" }}>Access Granted</h3>
            <p style={{ color: "#64748B" }}>
              You now have read-only access to {invite?.athlete_id}'s analysis history.
              Redirecting to your dashboard...
            </p>
          </>
        )}

        {!error && !accepted && invite && (
          <>
            <h3>You've Been Invited</h3>
            <p style={{ color: "#334155" }}>
              You've been invited to view the full injury-risk analysis history for
              athlete <strong>{invite.athlete_id}</strong>
              {invite.sport_type ? ` (${invite.sport_type})` : ""}.
            </p>
            <p style={{ color: "#64748B", fontSize: "13px" }}>
              Accepting grants you read-only access to their profile, uploaded videos,
              biomechanics reports, and injury risk data. You will not be able to edit
              their profile or upload videos on their behalf.
            </p>

            {invite.can_accept ? (
              <button className="btn" onClick={handleAccept} disabled={accepting}>
                {accepting ? "Accepting..." : "Accept Invite"}
              </button>
            ) : (
              <p style={{ color: "#F59E0B", fontWeight: 600 }}>{invite.message}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default InviteAccept;
