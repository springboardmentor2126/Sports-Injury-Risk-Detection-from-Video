import { createContext, useContext, useState } from "react";
import { uploadVideo, getBiomechanicsReport } from "../api/analysis";

const VideoAnalysisContext = createContext();

export function VideoAnalysisProvider({ children }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const startAnalysis = async (file, athleteId) => {
    setIsAnalyzing(true);
    setReport(null);
    setError(null);
    setStatusMessage("Uploading video and extracting frames…");
    try {
      const uploadResult = await uploadVideo(file);
      setStatusMessage(
        `${uploadResult.frames_extracted} frames extracted. Running pose detection and biomechanical analysis…`
      );
      const reportData = await getBiomechanicsReport(
        uploadResult.video_filename,
        athleteId || undefined
      );
      setReport(reportData);
      setStatusMessage("Analysis complete. Your report is ready.");
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      setStatusMessage("");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearReport = () => {
    setReport(null);
    setError(null);
    setStatusMessage("");
  };

  return (
    <VideoAnalysisContext.Provider
      value={{ isAnalyzing, statusMessage, report, error, startAnalysis, clearReport }}
    >
      {children}
    </VideoAnalysisContext.Provider>
  );
}

export function useVideoAnalysis() {
  return useContext(VideoAnalysisContext);
}