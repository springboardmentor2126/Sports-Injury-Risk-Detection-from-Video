import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button/Button';
import { getAnalysisHistory, getPoseResult, saveAnalysisHistory } from '../../services/api';
import styles from './AthleteIntelligenceDashboardPage.module.css';

function isValueAvailable(value) {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  return true;
}

function formatValue(value, fallback = 'No data available') {
  if (!isValueAvailable(value)) {
    return fallback;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toFixed(2) : String(value);
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : fallback;
  }

  return String(value);
}

function formatDateTime(value) {
  if (!isValueAvailable(value)) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleString();
}

function normalizeRiskLevel(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'high') {
    return 'High';
  }
  if (normalized === 'medium') {
    return 'Medium';
  }
  if (normalized === 'low') {
    return 'Low';
  }
  return null;
}

function buildDetectedIssuesFromMovementQuality(movementQuality) {
  if (!movementQuality || typeof movementQuality !== 'object' || Array.isArray(movementQuality)) {
    return [];
  }

  const issueMappings = [
    ['knee_valgus', 'Knee valgus detected'],
    ['excessive_torso_lean', 'Excessive torso lean detected'],
    ['hip_drop', 'Hip drop detected'],
    ['shoulder_imbalance', 'Shoulder imbalance detected'],
    ['poor_squat_depth', 'Poor squat depth detected'],
    ['posture_instability', 'Posture instability detected'],
  ];

  return issueMappings
    .filter(([key]) => movementQuality[key] === true)
    .map(([, label]) => label);
}

function getRiskStyle(level) {
  const normalized = normalizeRiskLevel(level);
  if (normalized === 'High') {
    return styles.riskHigh;
  }
  if (normalized === 'Medium') {
    return styles.riskMedium;
  }
  return styles.riskLow;
}

function buildHistoryEntry(report) {
  const timestamp = report?.timestamp || report?.created_at || report?.analysis?.timestamp || new Date().toISOString();

  return {
    id: report?.video_id || `${report?.risk_score ?? 'report'}-${timestamp}`,
    date: timestamp,
    riskScore: report?.risk_score ?? report?.riskScore ?? null,
    riskLevel: normalizeRiskLevel(report?.injury_risk || report?.risk_level),
    status: report?.status || 'Completed',
  };
}

export default function AthleteIntelligenceDashboardPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const videoId = window.sessionStorage.getItem('uploadedVideoId');
  const currentUserId = window.sessionStorage.getItem('currentUserId');

  async function loadHistory() {
    if (!currentUserId) {
      setHistory([]);
      return;
    }

    try {
      const entries = await getAnalysisHistory(currentUserId);
      setHistory(entries || []);
    } catch (historyError) {
      console.warn('AthleteIntelligenceDashboard: failed to load history', historyError);
      setHistory([]);
    }
  }

  useEffect(() => {
    const cachedReport = window.sessionStorage.getItem('poseAnalysis');

    async function persistAnalysisHistory(payload) {
      if (!currentUserId) {
        return;
      }

      try {
        await saveAnalysisHistory(payload);
        await loadHistory();
      } catch (historyError) {
        console.warn('AthleteIntelligenceDashboard: failed to save history', historyError);
      }
    }

    if (!videoId) {
      setError('No recent analysis found. Upload a video to create your first athlete intelligence report.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    let intervalId;

    async function fetchLatestAnalysis() {
      try {
        const result = await getPoseResult(videoId);
        if (cancelled) {
          return;
        }

        console.log('Dashboard API:', result);

        if (result?.status === 'completed') {
          const normalizedDetectedIssues = Array.isArray(result?.detected_issues) && result.detected_issues.length
            ? result.detected_issues
            : buildDetectedIssuesFromMovementQuality(result?.movement_quality ?? result?.analysis?.movement_quality);
          const normalizedRecommendations = Array.isArray(result?.recommendations) ? result.recommendations : [];
          const normalizedReport = {
            ...result,
            detected_issues: normalizedDetectedIssues,
            total_issues_detected: normalizedDetectedIssues.length,
            recommendations: normalizedRecommendations,
          };

          setReport(normalizedReport);

          persistAnalysisHistory({
            user_id: Number(currentUserId),
            video_id: result?.video_id || videoId,
            video_name: window.sessionStorage.getItem('uploadedVideoName') || null,
            risk_score: result?.risk_score ?? result?.riskScore ?? null,
            risk_level: result?.injury_risk || result?.risk_level || null,
            balance_score: result?.analysis?.average_balance_score ?? result?.balance_score ?? null,
            stability_score: result?.analysis?.posture_stability ?? result?.stability_score ?? null,
            pose_quality_score: result?.analysis?.pose_quality_score ?? result?.pose_quality_score ?? null,
            total_issues: normalizedDetectedIssues.length,
            total_issues_detected: normalizedDetectedIssues.length,
            detected_issues: normalizedDetectedIssues,
            recommendations: normalizedRecommendations,
            frames_processed: result?.frames_processed ?? result?.metadata?.total_frames ?? null,
            duration: result?.duration ?? result?.metadata?.duration ?? null,
            processing_status: 'Completed',
            analysis_time: result?.analysis_time ?? result?.analysis_date ?? result?.timestamp ?? result?.metadata?.processed_at ?? null,
          });
          setLoading(false);
          clearInterval(intervalId);
          return;
        }

        if (result?.status === 'pending' || result?.status === 'processing') {
          setError('');
          return;
        }

        if (result?.status === 'failed') {
          setError(result.error || 'The latest analysis could not be completed.');
          setLoading(false);
          clearInterval(intervalId);
          return;
        }

        setError('Unexpected response from the analysis service.');
        setLoading(false);
        clearInterval(intervalId);
      } catch (fetchError) {
        if (cancelled) {
          return;
        }

        if (cachedReport) {
          try {
            const parsed = JSON.parse(cachedReport);
            if (parsed?.status === 'completed') {
              const normalizedDetectedIssues = Array.isArray(parsed?.detected_issues) && parsed.detected_issues.length
                ? parsed.detected_issues
                : buildDetectedIssuesFromMovementQuality(parsed?.movement_quality ?? parsed?.analysis?.movement_quality);
              setReport({
                ...parsed,
                detected_issues: normalizedDetectedIssues,
                total_issues_detected: normalizedDetectedIssues.length,
                recommendations: Array.isArray(parsed?.recommendations) ? parsed.recommendations : [],
              });
              setLoading(false);
              clearInterval(intervalId);
              return;
            }
          } catch (parseError) {
            console.warn('AthleteIntelligenceDashboard: failed to parse cached poseAnalysis', parseError);
          }
        }

        setError(fetchError.message || 'Unable to load the latest analysis.');
        setLoading(false);
        clearInterval(intervalId);
      }
    }

    fetchLatestAnalysis();
    intervalId = window.setInterval(fetchLatestAnalysis, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [currentUserId, videoId]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let cancelled = false;

    async function fetchHistory() {
      try {
        const entries = await getAnalysisHistory(currentUserId);
        if (!cancelled) {
          setHistory(entries || []);
        }
      } catch (historyError) {
        console.warn('AthleteIntelligenceDashboard: failed to load history', historyError);
        if (!cancelled) {
          setHistory([]);
        }
      }
    }

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const sortedHistory = useMemo(() => {
    if (!Array.isArray(history)) {
      return [];
    }

    return [...history].sort((left, right) => {
      const leftTime = new Date(left.analysis_time || left.created_at || 0).getTime();
      const rightTime = new Date(right.analysis_time || right.created_at || 0).getTime();
      return rightTime - leftTime;
    });
  }, [history]);

  const latestHistory = sortedHistory?.[0] ?? null;

  const movementQuality = report?.movement_quality ?? report?.analysis?.movement_quality ?? latestHistory?.movement_quality ?? null;

  const detectedIssues = useMemo(() => {
    const directIssues = Array.isArray(report?.detected_issues)
      ? report.detected_issues
      : Array.isArray(latestHistory?.detected_issues)
        ? latestHistory.detected_issues
        : [];

    const normalizedDirectIssues = Array.isArray(directIssues)
      ? directIssues.filter((item) => isValueAvailable(item) && String(item).trim() !== '')
      : [];

    if (normalizedDirectIssues.length) {
      return normalizedDirectIssues;
    }

    return buildDetectedIssuesFromMovementQuality(movementQuality);
  }, [movementQuality, report, latestHistory]);

  const recommendations = useMemo(() => {
    const rawRecommendations = report?.recommendations ?? latestHistory?.recommendations ?? [];

    if (!Array.isArray(rawRecommendations)) {
      return [];
    }

    return rawRecommendations
      .filter((item) => {
        if (typeof item === 'string') {
          return item.trim() !== '';
        }

        if (typeof item === 'object' && item !== null) {
          return Boolean(item?.title || item?.description);
        }

        return false;
      })
      .map((item) => {
        if (typeof item === 'string') {
          return { key: item.trim(), text: item.trim() };
        }

        const title = typeof item?.title === 'string' ? item.title.trim() : '';
        const description = typeof item?.description === 'string' ? item.description.trim() : '';
        const text = title && description ? `${title}: ${description}` : title || description;
        return { key: title || description || 'recommendation', text };
      });
  }, [report]);

  const athleteName = useMemo(() => {
    const profileName = window.sessionStorage.getItem('currentUserName') || window.sessionStorage.getItem('athleteName') || window.sessionStorage.getItem('profileName');
    return (profileName || '').trim();
  }, []);

  const riskLevel = isValueAvailable(report?.injury_risk || report?.risk_level || latestHistory?.risk_level)
    ? normalizeRiskLevel(report?.injury_risk || report?.risk_level || latestHistory?.risk_level)
    : null;
  const riskScore = report?.risk_score ?? report?.riskScore ?? latestHistory?.risk_score ?? null;
  const analysisPayload = report?.analysis ?? {};
  const poseQualityScore = analysisPayload?.pose_quality_score ?? report?.pose_quality_score ?? latestHistory?.pose_quality_score ?? null;
  const balanceScore = analysisPayload?.average_balance_score ?? analysisPayload?.balance_score ?? report?.balance_score ?? latestHistory?.balance_score ?? null;
  const stabilityScore = analysisPayload?.posture_stability ?? analysisPayload?.stability_score ?? report?.stability_score ?? latestHistory?.stability_score ?? null;
  const framesProcessed = report?.frames_processed ?? report?.metadata?.total_frames ?? report?.pose_data?.length;
  const duration = report?.duration ?? report?.metadata?.duration;
  const processingStatus = isValueAvailable(report?.status)
    ? String(report.status).charAt(0).toUpperCase() + String(report.status).slice(1)
    : null;
  const analysisTimestamp = report?.analysis_time
    || report?.analysis_date
    || report?.timestamp
    || report?.analysis?.analysis_time
    || report?.analysis?.analysis_date
    || report?.created_at
    || report?.metadata?.processed_at
    || null;
  const analysisTime = formatDateTime(analysisTimestamp);

  const overviewItems = [
    isValueAvailable(riskScore)
      ? { label: 'Overall Risk Score', value: formatValue(riskScore), strong: true, pillClass: styles.scorePill }
      : null,
    riskLevel
      ? { label: 'Risk Level', value: riskLevel, pillClass: getRiskStyle(riskLevel) }
      : null,
    processingStatus
      ? { label: 'Processing Status', value: processingStatus }
      : null,
    analysisTime
      ? { label: 'Analysis Time', value: analysisTime }
      : null,
  ].filter(Boolean);

  const statItems = [
    isValueAvailable(framesProcessed)
      ? { label: 'Frames Processed', value: formatValue(framesProcessed) }
      : null,
    isValueAvailable(duration)
      ? { label: 'Video Duration', value: formatValue(duration) }
      : null,
    analysisTime
      ? { label: 'Analysis Time', value: analysisTime }
      : null,
    isValueAvailable(detectedIssues.length)
      ? { label: 'Total Issues Detected', value: String(detectedIssues.length) }
      : null,
  ].filter(Boolean);

  const movementMetrics = [
    isValueAvailable(poseQualityScore)
      ? { label: 'Pose Quality Score', value: formatValue(poseQualityScore) }
      : null,
    isValueAvailable(balanceScore)
      ? { label: 'Balance Score', value: formatValue(balanceScore) }
      : null,
    isValueAvailable(stabilityScore)
      ? { label: 'Stability Score', value: formatValue(stabilityScore) }
      : null,
  ].filter(Boolean);

  return (
    <div className={styles.layout}>
      <section className={styles.card}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Athlete Intelligence</p>
            <h1>{athleteName || 'Dashboard'}</h1>
            <p className={styles.sub}>A concise view of the latest injury-risk and movement-analysis results.</p>
          </div>
          {riskLevel ? (
            <div className={`${styles.badge} ${getRiskStyle(riskLevel)}`}>
              {riskLevel} Risk
            </div>
          ) : null}
        </header>

        {loading ? (
          <div className={styles.loadingArea}>Loading latest analysis...</div>
        ) : null}

        {!loading && error ? (
          <div className={styles.errorArea}>
            <p>{error}</p>
            <Button type="button" variant="secondary" onClick={() => navigate('/upload-video')}>
              Upload Video
            </Button>
          </div>
        ) : null}

        {!loading && !error && report ? (
          <>
            <div className={styles.heroSection}>
              <article className={styles.heroPanel}>
                <div>
                  <p className={styles.heroLabel}>Athlete Name</p>
                  <h2>{athleteName}</h2>
                  <p className={styles.heroDescription}>Latest movement assessment and injury-risk overview.</p>
                </div>
                <div className={styles.heroMetaRow}>
                  {analysisTime ? <span className={styles.timePill}>{analysisTime}</span> : null}
                  {processingStatus ? <span className={styles.statusPill}>{processingStatus}</span> : null}
                </div>
              </article>

              <article className={styles.heroPanel}>
                <div className={styles.heroSummaryList}>
                  {overviewItems.length ? (
                    overviewItems.map((item) => (
                      <div className={`${styles.overviewItem} ${item.strong ? styles.overviewItemStrong : ''}`} key={item.label}>
                        <span className={styles.overviewLabel}>{item.label}</span>
                        <span className={`${styles.overviewValue} ${item.pillClass || ''}`}>{item.value}</span>
                      </div>
                    ))
                  ) : (
                    <p className={styles.emptyState}>No data available</p>
                  )}
                </div>
              </article>
            </div>

            <div className={styles.statsGrid}>
              {statItems.length ? (
                statItems.map((item) => (
                  <article className={styles.statCard} key={item.label}>
                    <p className={styles.statLabel}>{item.label}</p>
                    <p className={styles.statValue}>{item.value}</p>
                  </article>
                ))
              ) : (
                <div className={styles.emptySection}>No data available</div>
              )}
            </div>

            <div className={styles.contentGrid}>
              <article className={styles.contentCard}>
                <div className={styles.cardHeader}>
                  <h3>Movement Metrics</h3>
                </div>
                {movementMetrics.length ? (
                  <div className={styles.metricList}>
                    {movementMetrics.map((metric) => (
                      <div className={styles.metricRow} key={metric.label}>
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyState}>No data available</p>
                )}
              </article>

              <article className={styles.contentCard}>
                <div className={styles.cardHeader}>
                  <h3>Detected Issues</h3>
                </div>
                {detectedIssues.length ? (
                  <div className={styles.issueList}>
                    {detectedIssues.map((issue, index) => (
                      <div key={`${issue}-${index}`} className={`${styles.issueBadge} ${styles[`issueTone${(index % 4) + 1}`]}`}>
                        {issue}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyState}>No movement issues detected.</p>
                )}
              </article>
            </div>

            <article className={styles.contentCard}>
              <div className={styles.cardHeader}>
                <h3>Recommendations</h3>
              </div>
              {recommendations.length ? (
                <ol className={styles.recommendationList}>
                  {recommendations.map((item, index) => (
                    <li key={item.key} className={styles.recommendationItem}>
                      <span className={styles.recommendationNumber}>{index + 1}</span>
                      <div className={styles.recommendationCopy}>
                        <p>{item.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.emptyState}>No recommendations are available for the current analysis.</p>
              )}
            </article>

            <article className={styles.contentCard}>
              <div className={styles.cardHeader}>
                <h3>Analysis History</h3>
              </div>
              {sortedHistory.length ? (
                <div className={styles.tableWrap}>
                  <table className={styles.historyTable}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Video Name</th>
                        <th>Risk Score</th>
                        <th>Risk Level</th>
                        <th>Total Issues</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedHistory.map((item) => (
                        <tr key={item.history_id ?? item.analysis_id ?? item.id}>
                          <td>{item.analysis_time ? new Date(item.analysis_time).toLocaleString() : item.created_at ? new Date(item.created_at).toLocaleString() : 'No data available'}</td>
                          <td>{item.video_name || item.video_id || 'N/A'}</td>
                          <td>{formatValue(item.risk_score ?? item.riskScore, 'No data available')}</td>
                          <td>{item.risk_level ?? item.riskLevel ?? 'Low'}</td>
                          <td>{formatValue(item.total_issues ?? item.totalIssues, '0')}</td>
                          <td>{item.processing_status || item.status || 'Completed'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={styles.emptyState}>No previous analyses available.</p>
              )}
            </article>
          </>
        ) : null}

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
          <Button type="button" onClick={() => navigate('/injury-risk-report')}>
            View Injury Risk Report
          </Button>
        </div>
      </section>
    </div>
  );
}
