import axios from "axios";

const API_BASE = "http://127.0.0.1:8000/api";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function uploadVideo(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axios.post(`${API_BASE}/upload-video/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function getBiomechanicsReport(videoFilename, athleteId) {
  const params = { video_filename: videoFilename };
  if (athleteId) params.athlete_id = athleteId;
  const response = await axios.post(`${API_BASE}/biomechanics-report/`, null, {
    params,
    headers: authHeaders(),
  });
  return response.data;
}

export async function getReportHistory() {
  const response = await axios.get(`${API_BASE}/reports/`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function getReportById(reportId) {
  const response = await axios.get(`${API_BASE}/reports/${reportId}`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function getProgressComparison(reportId) {
  const response = await axios.get(`${API_BASE}/reports/${reportId}/progress`, {
    headers: authHeaders(),
  });
  return response.data;
}