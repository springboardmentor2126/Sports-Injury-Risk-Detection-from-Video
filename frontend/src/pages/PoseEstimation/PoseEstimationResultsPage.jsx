import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button/Button';
import styles from './PoseEstimationResultsPage.module.css';

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not available';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'Not available';
  }

  return String(value);
}

export default function PoseEstimationResultsPage() {
  const navigate = useNavigate();
  const keyFeatures = [
    'Body Landmark Detection',
    'Skeleton Tracking',
    'Joint Position Analysis',
    'Movement Pattern Recognition',
    'Biomechanical Data Extraction',
  ];

  const report = useMemo(() => {
    const cached = window.sessionStorage.getItem('poseAnalysis');
    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached);
    } catch (error) {
      console.warn('PoseEstimationResultsPage: failed to parse poseAnalysis', error);
      return null;
    }
  }, []);

  const videoId = report?.video_id ?? window.sessionStorage.getItem('uploadedVideoId') ?? 'Not available';
  const processingStatus = report?.status ? String(report.status).trim() : 'Pending';
  const totalFramesAnalyzed = report?.total_frames ?? report?.frames_processed ?? report?.metadata?.total_frames ?? 'Not available';
  const poseFramesDetected = report?.pose_data?.length ?? report?.frames_processed ?? 'Not available';

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Pose Estimation</p>
          <h1>Pose Estimation &amp; Skeleton Tracking</h1>
          <div className={styles.headerContent}>
            <p className={styles.sub}>
              Visualize the body landmarks and skeletal structure extracted from uploaded sports videos.
            </p>
            {/* <p className={styles.sub}>
              The pose estimation engine detects key body joints such as shoulders, elbows, hips, knees, ankles, and wrists. These landmarks are used for biomechanical analysis, movement quality assessment, and injury risk prediction.
            </p> */}
          </div>
        </header>

        <div className={styles.summaryGrid}>
          <article className={styles.metricCard}>
            <h2>Video ID</h2>
            <p>{formatValue(videoId)}</p>
          </article>
          <article className={styles.metricCard}>
            <h2>Processing Status</h2>
            <p>{formatValue(processingStatus)}</p>
          </article>
          <article className={styles.metricCard}>
            <h2>Total Frames Analyzed</h2>
            <p>{formatValue(totalFramesAnalyzed)}</p>
          </article>
          <article className={styles.metricCard}>
            <h2>Pose Frames Detected</h2>
            <p>{formatValue(poseFramesDetected)}</p>
          </article>
        </div>

        <section className={styles.featuresCard}>
          <h2>Key Features</h2>
          <div className={styles.featureList}>
            {keyFeatures.map((feature) => (
              <div className={styles.featureItem} key={feature}>
                <span className={styles.checkIcon}>✓</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.infoCard}>
          <h3>How Pose Estimation Helps</h3>
          <p>
            Pose estimation converts athlete movements into body landmark coordinates. These coordinates are used to calculate joint angles, posture metrics, asymmetry measures, movement quality indicators, and injury risk scores.
          </p>
        </section>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
          <Button type="button" onClick={() => navigate('/biomechanical-analysis')}>
            Continue to Analysis
          </Button>
        </div>
      </section>
    </div>
  );
}
