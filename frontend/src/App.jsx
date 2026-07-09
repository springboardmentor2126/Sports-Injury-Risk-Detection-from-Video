import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AthleteList from "./pages/AthleteList";
import AthleteForm from "./pages/AthleteForm";
import AthleteDetail from "./pages/AthleteDetail";

export default function App() {
  return (
    <>
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
      </Routes>
    </>
  );
}
