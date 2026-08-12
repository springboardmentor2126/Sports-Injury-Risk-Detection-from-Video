import axios from "axios";

const API_BASE = "http://127.0.0.1:8000/api";

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

  const response = await axios.post(
    `${API_BASE}/biomechanics-report/`,
    null,
    { params }
  );
  return response.data;
}