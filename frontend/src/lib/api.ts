// ─── API base URL ─────────────────────────────────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Token helpers ────────────────────────────────────────────────
export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
};

export const setToken = (token: string): void => {
  localStorage.setItem("access_token", token);
};

export const removeToken = (): void => {
  localStorage.removeItem("access_token");
};

// ─── Base fetch wrapper ───────────────────────────────────────────
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    // FastAPI validation errors return detail as an array of objects
    const detail = error.detail;
    if (Array.isArray(detail)) {
      const messages = detail.map((e: { msg?: string; loc?: string[] }) =>
        `${e.loc ? e.loc[e.loc.length - 1] + ": " : ""}${e.msg || "Invalid value"}`
      ).join(" | ");
      throw new Error(messages);
    }
    throw new Error(typeof detail === "string" ? detail : "Something went wrong");
  }
  
  if (res.status === 204) {
    return {} as T;
  }
  
  return res.json();
}

// ─── Auth API ─────────────────────────────────────────────────────
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role_id: number;
  }) => request<{ id: string; email: string; first_name: string; last_name: string; role: { name: string } }>(
    "/api/auth/register",
    { method: "POST", body: JSON.stringify(data) }
  ),

  login: async (email: string, password: string) => {
    // OAuth2 form requires application/x-www-form-urlencoded
    const body = new URLSearchParams({ username: email, password });
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || "Login failed");
    }
    return res.json() as Promise<{ access_token: string; token_type: string }>;
  },

  getMe: () =>
    request<{ id: string; email: string; first_name: string; last_name: string; role: { id: number; name: string }; is_active: boolean; invite_code: string | null }>("/api/auth/me"),
    
  deleteAccount: () =>
    request<void>("/api/auth/me", { method: "DELETE" }),
};

// ─── Athlete Profile API ──────────────────────────────────────────
export const athleteApi = {
  getProfile: () => request<AthleteProfile>("/api/athletes/profile"),

  createProfile: (data: AthleteProfileInput) =>
    request<AthleteProfile>("/api/athletes/profile", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProfile: (data: AthleteProfileInput) =>
    request<AthleteProfile>("/api/athletes/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getInjuries: () => request<InjuryRecord[]>("/api/athletes/injuries"),

  addInjury: (data: InjuryInput) =>
    request<InjuryRecord>("/api/athletes/injuries", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAllAthletes: () => request<AthleteListItem[]>("/api/athletes/all"),

  linkProfessional: (invite_code: string) =>
    request<{ status: string; message: string }>("/api/athletes/link", {
      method: "POST",
      body: JSON.stringify({ invite_code }),
    }),

  getAthleteInjuries: (userId: string) => 
    request<InjuryRecord[]>(`/api/athletes/${userId}/injuries`),
};


// ─── Video Analysis API ───────────────────────────────────────────
export interface AnalysisResult {
  session_id: string;
  risk_level: "low" | "moderate" | "high" | "critical";
  video: {
    filename: string;
    duration_seconds: number;
    total_frames: number;
    frames_analyzed: number;
    frames_with_pose: number;
    pose_detection_rate: number;
  };
  annotated_video_url: string | null;   // temporary skeleton video — deleted after user views
  annotated_frames: string[];           // permanent screenshots
  biomechanics: {
    avg_left_knee_angle:   number | null;
    avg_right_knee_angle:  number | null;
    min_left_knee_angle:   number | null;
    min_right_knee_angle:  number | null;
    avg_left_hip_angle:    number | null;
    avg_right_hip_angle:   number | null;
    avg_left_elbow_angle:  number | null;
    avg_right_elbow_angle: number | null;
    avg_trunk_lean:        number | null;
    avg_knee_symmetry:     number | null;
    avg_hip_symmetry:      number | null;
    avg_overall_symmetry:  number | null;
  };
  risk_flags: {
    knee_hyperextension_frames:  number;
    knee_acute_flexion_frames:   number;
    excessive_trunk_lean_frames: number;
    low_symmetry_frames:         number;
    elbow_hyperextension_frames: number;
  };
}

export interface AnalysisHistoryItem {
  // Identity
  session_id: string;
  filename: string;
  duration_seconds: number | null;
  pose_detection_rate: number | null;
  frames_analyzed: number | null;
  frames_with_pose: number | null;
  risk_level: string | null;
  created_at: string;
  // Screenshots
  annotated_frames: string[];
  // Biomechanics
  avg_left_knee_angle:   number | null;
  avg_right_knee_angle:  number | null;
  min_left_knee_angle:   number | null;
  min_right_knee_angle:  number | null;
  avg_left_hip_angle:    number | null;
  avg_right_hip_angle:   number | null;
  avg_left_elbow_angle:  number | null;
  avg_right_elbow_angle: number | null;
  avg_trunk_lean:        number | null;
  avg_knee_symmetry:     number | null;
  avg_hip_symmetry:      number | null;
  avg_overall_symmetry:  number | null;
  // Risk flags
  frames_knee_hyperextension:  number;
  frames_knee_acute_flexion:   number;
  frames_excessive_trunk_lean: number;
  frames_low_symmetry:         number;
  frames_elbow_hyperextension: number;
}

export interface AthleteListItem {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  sport_type: string | null;
  session_count: number;
  latest_risk: string | null;
  latest_symmetry: number | null;
  last_session_at: string | null;
}

export const videoApi = {
  uploadVideo: async (file: File, onProgress?: (pct: number) => void): Promise<AnalysisResult> => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${BASE_URL}/api/video/analyze`);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round(e.loaded / e.total * 100));
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.detail || "Analysis failed"));
          } catch { reject(new Error("Analysis failed")); }
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(formData);
    });
  },

  getHistory: (): Promise<AnalysisHistoryItem[]> =>
    request<AnalysisHistoryItem[]>("/api/video/history"),

  getAthleteHistory: (userId: string): Promise<AnalysisHistoryItem[]> =>
    request<AnalysisHistoryItem[]>(`/api/video/athlete/${userId}/history`),

  deleteSkeletonVideo: (sessionId: string): Promise<void> => {
    const token = getToken();
    // Fire-and-forget: we don't block on this
    return fetch(`${BASE_URL}/api/video/${sessionId}/skeleton-video`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(() => undefined).catch(() => undefined);
  },
};

export interface AthleteProfile {
  id: string;
  user_id: string;
  sport_type: string;
  position: string | null;
  age: number;
  height_cm: number;
  weight_kg: number;
  weekly_training_hours: number;
  gender: string | null;
  dominant_limb: string | null;
  linked_coach_id: string | null;
  linked_physio_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AthleteProfileInput {
  sport_type: string;
  position?: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  weekly_training_hours: number;
  gender?: string;
  dominant_limb?: string;
}

export interface InjuryRecord {
  id: string;
  injury_name: string;
  affected_body_part: string;
  injury_date: string;
  recovery_duration_weeks: number | null;
  notes: string | null;
  created_at: string;
}

export interface InjuryInput {
  injury_name: string;
  affected_body_part: string;
  injury_date: string;
  recovery_duration_weeks?: number;
  notes?: string;
}
