import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";

// ── Session helpers ──────────────────────────────────────────────────────────
export function saveSession(data) {
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("user_role", data.role);
  localStorage.setItem("user_name", data.full_name || "");
  localStorage.setItem("user_email", data.email || "");
  localStorage.setItem("profile_completed", String(data.profile_completed));
}

export function clearSession() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_role");
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_email");
  localStorage.removeItem("profile_completed");
}

export function getSession() {
  return {
    token: localStorage.getItem("access_token"),
    role: localStorage.getItem("user_role"),
    name: localStorage.getItem("user_name"),
    email: localStorage.getItem("user_email"),
    profileCompleted: localStorage.getItem("profile_completed") === "true"
  };
}

// ── Auth API calls ───────────────────────────────────────────────────────────
export async function registerUser(fullName, email, password, confirmPassword, role) {
  const response = await axios.post(`${API_BASE}/register`, {
    full_name: fullName,
    email,
    password,
    confirm_password: confirmPassword,
    role
  });
  return response.data;
}

export async function loginUser(email, password) {
  const response = await axios.post(`${API_BASE}/login`, { email, password });
  return response.data;
}

export async function completeProfile(profileData) {
  const token = localStorage.getItem("access_token");
  const response = await axios.post(`${API_BASE}/complete-profile`, profileData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}

// ── Athlete self-service ─────────────────────────────────────────────────────
export async function getMyAthleteProfile() {
  const token = localStorage.getItem("access_token");
  const response = await axios.get(`${API_BASE}/athletes/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}

export async function updateMyAthleteProfile(data) {
  const token = localStorage.getItem("access_token");
  const response = await axios.put(`${API_BASE}/athletes/me`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}

export async function deleteMyAccount() {
  const token = localStorage.getItem("access_token");
  const response = await axios.delete(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}