import { Link, useNavigate } from "react-router-dom";
import {
    FaUserCircle,
    FaSignOutAlt,
    FaTachometerAlt,
    FaVideo,
    FaUsers,
    FaHeartbeat,
    FaFlask,
    FaUserShield
} from "react-icons/fa";

export default function Navbar() {

    const navigate = useNavigate();

    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    function logout() {

        localStorage.removeItem("token");
        localStorage.removeItem("role");

        navigate("/login");

    }

    function getDashboardLink() {

        switch (role) {

            case "Coach":
                return "/coach";

            case "Physiotherapist":
                return "/physio";

            case "Sports Scientist":
                return "/scientist";

            case "Admin":
                return "/admin";

            default:
                return "/dashboard";

        }

    }

    return (

        <nav className="navbar">

            <h2 className="logo">

                Sports Injury Detection

            </h2>

            {

                token &&

                <div className="nav-links">

                    <Link to={getDashboardLink()}>

                        <FaTachometerAlt />

                        Dashboard

                    </Link>

                    {

                        role === "Athlete" &&

                        <Link to="/upload">

                            <FaVideo />

                            Upload

                        </Link>

                    }

                    {

                        role === "Coach" &&

                        <Link to="/coach">

                            <FaUsers />

                            Team

                        </Link>

                    }

                    {

                        role === "Physiotherapist" &&

                        <Link to="/physio">

                            <FaHeartbeat />

                            Recovery

                        </Link>

                    }

                    {

                        role === "Sports Scientist" &&

                        <Link to="/scientist">

                            <FaFlask />

                            Research

                        </Link>

                    }

                    {

                        role === "Admin" &&

                        <Link to="/admin">

                            <FaUserShield />

                            Admin

                        </Link>

                    }

                    <Link to="/profile">

                        <FaUserCircle />

                        Profile

                    </Link>

                    <button
                        className="logout-btn"
                        onClick={logout}
                    >

                        <FaSignOutAlt />

                        Logout

                    </button>

                </div>

            }

        </nav>

    );

}