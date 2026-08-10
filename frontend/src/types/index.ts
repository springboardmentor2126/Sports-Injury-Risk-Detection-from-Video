export type UserRole =
  | "athlete"
  | "coach"
  | "physiotherapist"
  | "sports_scientist"
  | "admin";

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface AthleteProfile {
  athlete_id: string;
  user_id: string;
  age: number | null;
  gender: string | null;
  sport: string | null;
  position: string | null;
  height: number | null;
  weight: number | null;
  injury_history: string | null;
  training_load: string | null;
}

export type AthleteProfileUpdate = Partial<
  Omit<AthleteProfile, "athlete_id" | "user_id">
>;

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export type RiskLevel = "low" | "moderate" | "high" | "critical";

// --- Milestone 2: Video / Pose / Biomechanics ---

export type VideoStatus = "uploaded" | "processing" | "completed" | "failed";

export interface BiomechanicsSummary {
  frames_analyzed: number;
  frames_with_detection: number;
  avg_left_knee_angle: number | null;
  avg_right_knee_angle: number | null;
  avg_trunk_lean_deg: number | null;
  left_knee_rom: number | null;
  right_knee_rom: number | null;
  knee_rom_asymmetry: number | null;
  peak_knee_valgus_proxy: number | null;
}

export interface VideoSummary {
  video_id: string;
  athlete_id: string;
  file_name: string;
  upload_date: string;
  status: VideoStatus;
  error_message: string | null;
  has_annotated_video: boolean;
}

export interface VideoDetail extends VideoSummary {
  biomechanics_summary: BiomechanicsSummary | null;
}

export interface FrameMetrics {
  frame_number: number;
  left_knee_angle: number | null;
  right_knee_angle: number | null;
  left_elbow_angle: number | null;
  right_elbow_angle: number | null;
  left_hip_angle: number | null;
  right_hip_angle: number | null;
  trunk_lean_deg: number | null;
  knee_valgus_proxy: number | null;
  knee_symmetry_diff: number | null;
}
