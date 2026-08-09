const API_BASE = "http://localhost:8000";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Something went wrong. Please try again.");
  }
  return data;
}

export const api = {
  // Milestone 1
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  getMe: (token) => request("/auth/me", { token }),
  getMyProfile: (token) => request("/athletes/me", { token }),
  saveMyProfile: (payload, token) => request("/athletes/me", { method: "POST", body: payload, token }),

  // Milestone 2
  listVideos: (token) => request("/videos", { token }),
  uploadVideo: async (file, activityType, token) => {
    const formData = new FormData();
    formData.append("file", file);
    if (activityType) formData.append("activity_type", activityType);
    const res = await fetch(`${API_BASE}/videos/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "Upload failed.");
    return data;
  },
  processVideo: (videoId, token) => request(`/videos/${videoId}/process`, { method: "POST", token }),
  getReport: (videoId, token) => request(`/videos/${videoId}/report`, { token }),
  overlayVideoUrl: (videoId) => `${API_BASE}/videos/${videoId}/overlay`,

  // Milestone 3
  runRiskAssessment: (videoId, token) => request(`/videos/${videoId}/risk-assessment`, { method: "POST", token }),
  getRiskAssessment: (videoId, token) => request(`/videos/${videoId}/risk-assessment`, { token }),

  // Milestone 4
  getDashboard: (token) => request("/dashboard/me", { token }),
};
