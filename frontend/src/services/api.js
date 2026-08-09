const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8001';
const DEFAULT_TIMEOUT_MS = 3000;

function getCurrentUserIdFromSession() {
  const currentUserId = window.sessionStorage.getItem('currentUserId');
  if (!currentUserId) {
    return null;
  }

  return currentUserId;
}

function buildAuthHeaders() {
  const currentUserId = getCurrentUserIdFromSession();
  return currentUserId ? { 'X-Current-User-Id': String(currentUserId) } : {};
}

async function apiRequest(path, options = {}) {
  let response;
  const controller = new AbortController();
  const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT_MS;
  const timeoutId = setTimeout(() => {
    console.log(`[API] Request timeout after ${timeoutMs}ms for ${path}`);
    controller.abort();
  }, timeoutMs);

  console.log(`[API] Fetching: ${API_BASE_URL}${path} with timeout ${timeoutMs}ms`);

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(),
        ...(options.headers ?? {}),
      },
      signal: controller.signal,
      ...options,
    });
    console.log(`[API] Response received for ${path}: status=${response.status}`);
  } catch (error) {
    console.error(`[API] Fetch error for ${path}:`, error.name, error.message);
    if (error.name === 'AbortError') {
      throw new Error('The backend service is taking too long to respond. Please try again.');
    }

    throw new Error(`Unable to connect to the backend service at ${API_BASE_URL}. Make sure the backend is running.`);
  } finally {
    clearTimeout(timeoutId);
  }

  let responseBody;
  try {
    responseBody = await response.json();
    console.log(`[API] JSON parsed for ${path}:`, Object.keys(responseBody || {}));
  } catch (error) {
    console.error(`[API] Failed to parse JSON for ${path}:`, error);
    responseBody = null;
  }

  if (!response.ok) {
    const message = responseBody?.detail ?? 'Request failed. Please try again.';
    console.error(`[API] Response not ok for ${path}: ${response.status} - ${message}`);
    throw new Error(message);
  }

  return responseBody;
}

export function loginUser(credentials) {
  return apiRequest('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export function signupUser(account) {
  return apiRequest('/api/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify(account),
  });
}

export function createAthleteProfile(profile) {
  return apiRequest('/api/v1/athlete/profile', {
    method: 'POST',
    body: JSON.stringify(profile),
  });
}

export function getAthleteProfile(userId) {
  return apiRequest(`/api/v1/athlete/profile/${userId}`, {
    method: 'GET',
  });
}

export function updateAthleteProfile(userId, profile) {
  return apiRequest(`/api/v1/athlete/profile/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
}

export async function uploadVideo(file, userId = null) {
  const formData = new FormData();
  formData.append('video', file);
  if (userId) {
    formData.append('user_id', String(userId));
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/videos/upload`, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: formData,
    });
  } catch {
    throw new Error('Unable to connect to the upload service. Make sure the backend is running.');
  }

  let responseBody;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    const message = responseBody?.detail ?? 'Video upload failed. Please try again.';
    throw new Error(message);
  }

  return responseBody;
}

export async function getPoseResult(videoId) {
  // Increased timeout to 30 seconds for pose result polling (can have large payload)
  return apiRequest(`/api/v1/pose-result/${videoId}`, { 
    method: 'GET',
    timeout: 30000
  });
}

export function saveAnalysisHistory(payload) {
  return apiRequest('/api/v1/analysis-history', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getAnalysisHistory(userId) {
  return apiRequest(`/api/v1/analysis-history/${encodeURIComponent(userId)}`, {
    method: 'GET',
  });
}
