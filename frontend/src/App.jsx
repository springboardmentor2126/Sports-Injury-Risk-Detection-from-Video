import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import UploadVideo from "./pages/UploadVideo";

import CoachDashboard from "./pages/CoachDashboard";
import PhysioDashboard from "./pages/PhysioDashboard";
import ScientistDashboard from "./pages/ScientistDashboard";
import AdminDashboard from "./pages/AdminDashboard";

import NotFound from "./pages/NotFound";

function App() {

    return (

        <>

            <Navbar />

            <Routes>

                <Route path="/" element={<Landing />} />

                <Route path="/register" element={<Register />} />

                <Route path="/login" element={<Login />} />

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/coach"
                    element={
                        <ProtectedRoute>
                            <CoachDashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/physio"
                    element={
                        <ProtectedRoute>
                            <PhysioDashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/scientist"
                    element={
                        <ProtectedRoute>
                            <ScientistDashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute>
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <Profile />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/upload"
                    element={
                        <ProtectedRoute>
                            <UploadVideo />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="*"
                    element={<NotFound />}
                />

            </Routes>

        </>

    );

}

export default App;