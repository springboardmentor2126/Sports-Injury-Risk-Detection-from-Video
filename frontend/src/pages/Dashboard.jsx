import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../api/auth";
import AthleteDashboard from "./AthleteDashboard";
import CoachDashboard from "./CoachDashboard";

function Dashboard() {
  const navigate = useNavigate();
  const { role, profileCompleted } = getSession();

  useEffect(() => {
    if (role === "Athlete" && !profileCompleted) {
      navigate("/complete-profile", { replace: true });
    }
  }, []);

  if (role === "Athlete") return <AthleteDashboard />;
  return <CoachDashboard />;
}

export default Dashboard;