const BASE_URL = "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("access_token");
}

async function request(path, { method = "GET", body, auth = true, form = false } = {}) {
  const headers = {};
  if (!form) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: form ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = "Request failed";
    try {
      const errJson = await res.json();
      detail = errJson.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  register: (data) => request("/auth/register", { method: "POST", body: data, auth: false }),

  login: (email, password) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    return request("/auth/login", { method: "POST", body: form, auth: false, form: true });
  },

  me: () => request("/auth/me"),

  listAthletes: () => request("/athletes/"),
  getAthlete: (id) => request(`/athletes/${id}`),
  createAthlete: (data) => request("/athletes/", { method: "POST", body: data }),
  updateAthlete: (id, data) => request(`/athletes/${id}`, { method: "PUT", body: data }),
  deleteAthlete: (id) => request(`/athletes/${id}`, { method: "DELETE" }),
};
