import "./index.css";
import "./styles/global.css";
import "./App.css";
 
import { BrowserRouter, Routes, Route } from "react-router-dom";
 
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
 
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import AthleteProfile from "./pages/AthleteProfile";
import UploadVideo from "./pages/UploadVideo";
import Results from "./pages/Results";
import AdminDashboard from "./pages/AdminDashboard";
 
function App() {
  return (
    <BrowserRouter>
      <div className="app">
 
        <Navbar />
 
        <main>
 
          <Routes>
 
            <Route path="/" element={<Home />} />
 
            <Route path="/login" element={<Login />} />
 
            <Route path="/register" element={<Register />} />
 
            <Route path="/forgot-password" element={<ForgotPassword />} />
 
            <Route path="/reset-password" element={<ResetPassword />} />
 
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
 
            <Route
              path="/athlete-profile"
              element={
                <ProtectedRoute>
                  <AthleteProfile />
                </ProtectedRoute>
              }
            />
 
            <Route
              path="/upload-video"
              element={
                <ProtectedRoute>
                  <UploadVideo />
                </ProtectedRoute>
              }
            />
 
            <Route
              path="/results"
              element={
                <ProtectedRoute>
                  <Results />
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
 
          </Routes>
 
        </main>
 
        <Footer />
 
      </div>
    </BrowserRouter>
  );
}
 
export default App;
 