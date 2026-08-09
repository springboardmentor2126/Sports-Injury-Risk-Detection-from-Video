import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPoseResult } from "../../services/api";
import styles from "./PoseEstimationPage.module.css";

const STEPS = [
  "Video uploaded",
  "Extracting video frames",
  "Detecting body joints",
  "Generating skeletal keypoints",
  "Preparing biomechanical analysis",
];

export default function PoseEstimationPage() {
  const navigate = useNavigate();

  const [statuses, setStatuses] = useState([
    "done",
    "in-progress",
    "pending",
    "pending",
    "pending",
  ]);

  const [error, setError] = useState("");
  const [isPolling, setIsPolling] = useState(true);

  const videoId = sessionStorage.getItem("uploadedVideoId");

  const completed = useMemo(
    () => statuses.every((s) => s === "done"),
    [statuses]
  );

  useEffect(() => {
    if (!videoId) {
      console.error("[POSE] PoseEstimationPage: No uploaded video id found in sessionStorage.");
      setError("No uploaded video found.");
      setIsPolling(false);
      return;
    }

    console.log("[POSE] ====== Polling started ======");
    console.log("[POSE] videoId:", videoId);
    console.log("[POSE] sessionStorage.uploadedVideoId:", sessionStorage.getItem("uploadedVideoId"));
    let cancelled = false;
    let interval;
    let pollCount = 0;

    async function pollStatus() {
      pollCount++;
      console.log(`[POSE] [Poll #${pollCount}] Starting poll...`);
      try {
        const result = await getPoseResult(videoId);
        console.log(`[POSE] [Poll #${pollCount}] Backend response received:`, result);
        console.log(`[POSE] [Poll #${pollCount}] Status:`, result?.status);
        console.log(`[POSE] [Poll #${pollCount}] Result keys:`, result ? Object.keys(result) : 'null');
        console.log(`[POSE] [Poll #${pollCount}] Frames processed:`, result?.frames_processed);
        console.log(`[POSE] [Poll #${pollCount}] Has pose_data:`, result?.pose_data?.length > 0);
        console.log(`[POSE] [Poll #${pollCount}] Has analysis:`, !!result?.analysis);

        if (cancelled) {
          console.log(`[POSE] [Poll #${pollCount}] Poll was cancelled, ignoring result`);
          return;
        }

        if (result.status === "pending") {
          console.log(`[POSE] [Poll #${pollCount}] Status is 'pending', continuing to poll...`);
          setStatuses([
            "done",
            "done",
            "in-progress",
            "pending",
            "pending",
          ]);
          return;
        }

        if (result.status === "failed") {
          console.error(`[POSE] [Poll #${pollCount}] Backend reported failure:`, result.error || result);
          setError(result.error || 'Processing failed on the backend.');
          setIsPolling(false);
          clearInterval(interval);
          return;
        }

        if (result.status === "completed" || result.status === "done") {
          console.log(`[POSE] [Poll #${pollCount}] Status is 'completed' or 'done', marking all steps as done`);
          setStatuses([
            "done",
            "done",
            "done",
            "done",
            "done",
          ]);

          console.log("[POSE] Saving poseAnalysis to sessionStorage:", {
            status: result.status,
            frames_processed: result.frames_processed,
            video_id: result.video_id,
          });
          sessionStorage.setItem("poseAnalysis", JSON.stringify(result));
          sessionStorage.setItem("poseAnalysisVideoId", result.video_id || videoId);

          setIsPolling(false);
          clearInterval(interval);

          console.log(`[POSE] [Poll #${pollCount}] Navigating to biomechanical-analysis in 800ms`);
          setTimeout(() => {
            console.log("[POSE] Navigation timeout reached, navigating now");
            navigate("/biomechanical-analysis");
          }, 800);

          return;
        }

        // If we receive any other non-pending/non-completed status, stop and show error
        console.warn(`[POSE] [Poll #${pollCount}] Unexpected backend status:`, result);
        setError('Unexpected backend response. Processing halted.');
        setIsPolling(false);
        clearInterval(interval);
        return;
      } catch (err) {
        if (cancelled) {
          console.log(`[POSE] [Poll #${pollCount}] Poll failed but was cancelled, ignoring error`);
          return;
        }

        console.error(`[POSE] [Poll #${pollCount}] Polling failed:`, err);
        console.error(`[POSE] [Poll #${pollCount}] Error message:`, err.message);
        setError(err.message || "Unable to process video.");
        setIsPolling(false);
        clearInterval(interval);
      }
    }

    console.log("[POSE] Making initial poll");
    pollStatus();

    console.log("[POSE] Setting up interval for polling every 2000ms");
    interval = setInterval(pollStatus, 2000);

    return () => {
      console.log("[POSE] Cleanup: cancelling polls and clearing interval");
      cancelled = true;
      clearInterval(interval);
    };
  }, [videoId, navigate]);

  return (
    <div className={styles.layout}>
      <section className={styles.card}>
        <h1>Pose Estimation</h1>

        <p>
          {error
            ? error
            : isPolling
            ? "Processing video..."
            : "Processing completed."}
        </p>

        <div className={styles.statusCard}>
          {STEPS.map((step, index) => (
            <div key={step} className={styles.stepRow}>
              <div className={styles.stepIcon}>
                {statuses[index] === "done" ? (
                  "✔"
                ) : statuses[index] === "in-progress" ? (
                  "⏳"
                ) : (
                  "○"
                )}
              </div>

              <div>
                <strong>{step}</strong>
              </div>
            </div>
          ))}
        </div>

        {completed && (
          <p style={{ color: "green", marginTop: "20px" }}>
            Pose estimation completed successfully.
          </p>
        )}

        {error && (
          <p style={{ color: "red", marginTop: "20px" }}>
            {error}
          </p>
        )}
      </section>
    </div>
  );
}