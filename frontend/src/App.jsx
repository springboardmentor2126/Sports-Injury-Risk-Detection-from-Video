import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Backdrop from "./components/Backdrop";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AthleteList from "./pages/AthleteList";
import AthleteForm from "./pages/AthleteForm";
import AthleteDetail from "./pages/AthleteDetail";
import VideoUpload from "./pages/VideoUpload";
import VideoList from "./pages/VideoList";
import VideoDetail from "./pages/VideoDetail";

function backdropVariant(pathname) {
  if (pathname === "/") return "home";
  if (pathname === "/login") return "login";
  if (pathname === "/register") return "register";
  if (pathname === "/videos/upload") return "upload";
  if (pathname.startsWith("/videos")) return "videos";
  if (pathname.startsWith("/athletes")) return "athletes";
  return "app";
}

export default function App() {
  const location = useLocation();
  return (
    <>
      <Backdrop variant={backdropVariant(location.pathname)} />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/athletes" element={
          <ProtectedRoute><AthleteList /></ProtectedRoute>
        } />
        <Route path="/athletes/new" element={
          <ProtectedRoute><AthleteForm /></ProtectedRoute>
        } />
        <Route path="/athletes/:id" element={
          <ProtectedRoute><AthleteDetail /></ProtectedRoute>
        } />
        <Route path="/athletes/:id/edit" element={
          <ProtectedRoute><AthleteForm /></ProtectedRoute>
        } />
        <Route path="/videos" element={
          <ProtectedRoute><VideoList /></ProtectedRoute>
        } />
        <Route path="/videos/upload" element={
          <ProtectedRoute><VideoUpload /></ProtectedRoute>
        } />
        <Route path="/videos/:id" element={
          <ProtectedRoute><VideoDetail /></ProtectedRoute>
        } />
      </Routes>
    </>
  );
}
