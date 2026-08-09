import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button/Button';
import { getPoseResult, saveAnalysisHistory } from '../../services/api';
import styles from './BiomechanicalAnalysisPage.module.css';

const allowedMetrics = [
  'left_knee_angle',
  'right_knee_angle',
  'left_hip_angle',
  'right_hip_angle',
  'shoulder_alignment',
  'torso_lean',
  'balance_score',
  'stride_length',
];

function formatLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not available';
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return `${numericValue.toFixed(2)}`;
  }

  return 'Not available';
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not available';
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : 'Not available';
  }

  if (typeof value === 'object') {
    return 'Not available';
  }

  return String(value);
}

function collectBiomechanicalMetrics(analysis) {
  const entries = [];
  const source = analysis?.analysis && typeof analysis.analysis === 'object' && !Array.isArray(analysis.analysis)
    ? analysis.analysis
    : analysis;

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return entries;
  }

  allowedMetrics.forEach((key) => {
    const value = source?.[key];
    if (value === undefined || value === null || value === '') {
      return;
    }

    const metricObject = value && typeof value === 'object' && !Array.isArray(value)
      ? {
          average: value?.average,
          minimum: value?.minimum,
          maximum: value?.maximum,
          stdDev: value?.std_dev,
        }
      : null;

    entries.push({
      label: formatLabel(key),
      value: formatValue(value),
      average: metricObject ? formatNumber(metricObject.average) : formatValue(value),
      minimum: metricObject ? formatNumber(metricObject.minimum) : null,
      maximum: metricObject ? formatNumber(metricObject.maximum) : null,
      stdDev: metricObject ? formatNumber(metricObject.stdDev) : null,
      isStructuredMetric: Boolean(metricObject),
    });
  });

  return entries;
}

export default function BiomechanicalAnalysisPage() {
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const videoId = window.sessionStorage.getItem('uploadedVideoId');
  const currentUserId = window.sessionStorage.getItem('currentUserId');

  useEffect(() => {
    const cachedAnalysis = window.sessionStorage.getItem('poseAnalysis');
    console.log('BiomechanicalAnalysisPage start', { videoId, cachedAnalysis });

    if (cachedAnalysis) {
      try {
        const parsed = JSON.parse(cachedAnalysis);
        if (parsed?.status === 'completed') {
          setAnalysis(parsed);
          setLoading(false);
          return;
        }
      } catch (parseError) {
        console.warn('Failed to parse cached poseAnalysis', parseError);
        window.sessionStorage.removeItem('poseAnalysis');
      }
    }

    if (!videoId) {
      console.error('BiomechanicalAnalysisPage: No uploadedVideoId found in sessionStorage');
      setError('No uploaded video found. Please upload a video first.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    let interval;

    async function fetchAnalysis() {
      try {
        const result = await getPoseResult(videoId);
        console.log('BiomechanicalAnalysisPage backend response:', result);

        if (cancelled) return;

        if (result?.status === 'pending' || result?.status === 'processing') {
          console.log('BiomechanicalAnalysisPage: result still pending/processing');
          return;
        }
        if (result?.status === 'completed') {
          console.log('BiomechanicalAnalysisPage: result completed');
          console.log('BiomechanicalAnalysisPage: API response received', result);
          setAnalysis(result);
          console.log('BiomechanicalAnalysisPage: Data saved to sessionStorage', result);
          window.sessionStorage.setItem('poseAnalysis', JSON.stringify(result));
          if (currentUserId) {
            try {
              await saveAnalysisHistory({
                user_id: Number(currentUserId),
                video_id: result?.video_id || videoId,
                video_name: window.sessionStorage.getItem('uploadedVideoName') || null,
                risk_score: result?.risk_score ?? result?.riskScore ?? null,
                risk_level: result?.injury_risk || result?.risk_level || null,
                balance_score: result?.analysis?.average_balance_score ?? result?.balance_score ?? null,
                stability_score: result?.analysis?.posture_stability ?? result?.stability_score ?? null,
                pose_quality_score: result?.analysis?.pose_quality_score ?? result?.pose_quality_score ?? null,
                detected_issues: Array.isArray(result?.detected_issues) ? result.detected_issues : [],
                recommendations: Array.isArray(result?.recommendations) ? result.recommendations : [],
                frames_processed: result?.frames_processed ?? result?.metadata?.total_frames ?? null,
                duration: result?.duration ?? result?.metadata?.duration ?? null,
                analysis_time: result?.analysis_time ?? result?.analysis_date ?? result?.timestamp ?? result?.metadata?.processed_at ?? null,
              });
            } catch (historyError) {
              console.warn('BiomechanicalAnalysisPage: failed to save history', historyError);
            }
          }
          setLoading(false);
          clearInterval(interval);
          return;
        }
        if (result?.status === 'failed') {
          console.error('BiomechanicalAnalysisPage: backend processing failed', result.error || result);
          setError(result.error || 'Processing failed on the backend.');
          setLoading(false);
          clearInterval(interval);
          return;
        }

        console.error('BiomechanicalAnalysisPage: unexpected backend response', result);
        setError('Unexpected response from backend.');
        setLoading(false);
        clearInterval(interval);
      } catch (err) {
        if (cancelled) return;

        console.error('BiomechanicalAnalysisPage: fetchAnalysis error', err);
        setError(err.message || 'Failed to load analysis results.');
        setLoading(false);
        clearInterval(interval);
      }
    }

    fetchAnalysis();
    interval = setInterval(fetchAnalysis, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [videoId]);

  const analysisItems = useMemo(() => collectBiomechanicalMetrics(analysis), [analysis]);

  return (
    <div className={styles.layout}>
      <section className={styles.card}>
        <header className={styles.header}>
          <h1>Biomechanical Analysis</h1>
          <p className={styles.sub}>Review the movement summary generated from the pose estimation output.</p>
        </header>

        {loading ? (
          <div className={styles.loadingArea}>
            <div className={styles.spinner} aria-hidden="true" />
            <p>Loading biomechanical analysis...</p>
          </div>
        ) : null}

        {!loading && error ? (
          <div className={styles.errorArea}>
            <p>{error}</p>
            <Button type="button" variant="secondary" onClick={() => navigate('/upload-video')}>
              Upload Video
            </Button>
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            <div className={styles.analysisGrid}>
              {analysisItems.length ? (
                analysisItems.map((item) => (
                  <article className={styles.analysisCard} key={item.label}>
                    <h2>{item.label}</h2>
                    {item.isStructuredMetric ? (
                      <>
                        <p className={styles.averageValue}>Average: {item.average}</p>
                        <div className={styles.metricStats}>
                          <span>Min: {item.minimum}</span>
                          <span>Max: {item.maximum}</span>
                          <span>Std Dev: {item.stdDev}</span>
                        </div>
                      </>
                    ) : (
                      <p>{item.value}</p>
                    )}
                  </article>
                ))
              ) : (
                <article className={styles.analysisCard}>
                  <h2>No Metrics</h2>
                  <p>No biomechanical metrics were returned.</p>
                </article>
              )}
            </div>

            <div className={styles.actions}>
              <Button type="button" onClick={() => navigate('/injury-risk-report')}>
                View Injury Risk Report
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
