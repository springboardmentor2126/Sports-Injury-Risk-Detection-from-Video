import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button/Button';
import { downloadReportPdf } from '../../utils/reportPdf';
import styles from './InjuryRiskReportPage.module.css';

function getRiskDetails(riskLevel) {
  const normalized = (riskLevel || '').toString().trim().toLowerCase();

  if (normalized === 'high') {
    return {
      className: styles.riskHigh,
      title: 'High Risk',
      label: 'HIGH RISK',
      icon: '🚨',
      description: 'Immediate attention is recommended because the current movement pattern shows notable injury indicators.',
    };
  }

  if (normalized === 'medium') {
    return {
      className: styles.riskMedium,
      title: 'Medium Risk',
      label: 'MEDIUM RISK',
      icon: '⚠',
      description: 'Your movement is mostly stable, but a few mechanics could be improved to reduce strain.',
    };
  }

  return {
    className: styles.riskLow,
    title: 'Low Risk',
    label: 'LOW RISK',
    icon: '✓',
    description: 'Your movement appears stable and no significant injury indicators were detected.',
  };
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not available';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toFixed(2) : String(value);
  }

  return String(value);
}

function formatStatus(value) {
  if (!value) {
    return 'Completed';
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'completed') {
    return 'Completed';
  }

  if (normalized === 'processing') {
    return 'Processing';
  }

  return value;
}

function buildDetectedIssues(report) {
  const movementQuality = report?.movement_quality ?? report?.analysis?.movement_quality;

  if (!movementQuality || typeof movementQuality !== 'object' || Array.isArray(movementQuality)) {
    return [];
  }

  const entries = [];

  const addEntry = (key, issueLabel, normalLabel) => {
    if (movementQuality[key] === undefined || movementQuality[key] === null) {
      return;
    }

    if (movementQuality[key] === true) {
      entries.push({ type: 'issue', label: issueLabel });
      return;
    }

    entries.push({ type: 'normal', label: normalLabel });
  };

  addEntry('shoulder_imbalance', 'Shoulder Alignment Issue Detected', 'Shoulder Alignment Normal');
  addEntry('excessive_torso_lean', 'Excessive Torso Lean', 'No Excessive Torso Lean');
  addEntry('hip_drop', 'Hip Drop Detected', 'No Hip Drop');
  addEntry('knee_valgus', 'Knee Asymmetry Detected', 'No Knee Asymmetry Detected');
  addEntry('posture_instability', 'Posture Instability Detected', 'Posture Stable');
  addEntry('poor_squat_depth', 'Poor Squat Depth Detected', 'Squat Depth Appears Adequate');

  return entries;
}

function formatRiskScore(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  const roundedValue = numericValue % 1 === 0 ? numericValue.toFixed(0) : numericValue.toFixed(2);
  return `${roundedValue}/100`;
}

export default function InjuryRiskReportPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [downloadMessage, setDownloadMessage] = useState('');

  const athleteName = window.sessionStorage.getItem('currentUserName')
    || window.sessionStorage.getItem('athleteName')
    || window.sessionStorage.getItem('profileName')
    || 'Current Athlete';
  const videoName = window.sessionStorage.getItem('uploadedVideoName') || 'Uploaded Video';

  useEffect(() => {
    const cached = window.sessionStorage.getItem('poseAnalysis');
    console.log('InjuryRiskReportPage: sessionStorage poseAnalysis raw value', cached);

    if (!cached) {
      console.warn('InjuryRiskReportPage: no poseAnalysis found in sessionStorage');
      navigate('/upload-video', { replace: true });
      return;
    }

    try {
      const parsed = JSON.parse(cached);
      console.log('InjuryRiskReportPage: Data loaded from sessionStorage', parsed);
      if (parsed?.status === 'completed') {
        setReport(parsed);
        return;
      }
    } catch (error) {
      console.error('InjuryRiskReportPage: failed to parse poseAnalysis from sessionStorage', error);
      window.sessionStorage.removeItem('poseAnalysis');
    }

    navigate('/upload-video', { replace: true });
  }, [navigate]);

  const recommendations = useMemo(() => {
    const rawRecommendations = report?.recommendations ?? [];

    if (!Array.isArray(rawRecommendations)) {
      return [];
    }

    return rawRecommendations
      .filter((item) => {
        if (item === null || item === undefined) {
          return false;
        }

        if (typeof item === 'string') {
          return item.trim() !== '';
        }

        if (typeof item === 'object') {
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

  const riskDetails = useMemo(() => getRiskDetails(report?.injury_risk), [report?.injury_risk]);
  const riskLabel = report?.injury_risk ? riskDetails.title : 'Low Risk';
  const riskDescription = report?.injury_risk ? riskDetails.description : 'Your movement appears stable and no significant injury indicators were detected.';
  const riskScore = useMemo(() => formatRiskScore(report?.risk_score ?? report?.riskScore), [report?.risk_score, report?.riskScore]);
  const detectedIssues = useMemo(() => buildDetectedIssues(report), [report]);

  const framesProcessed = report?.frames_processed ?? report?.pose_data?.length ?? 'Not available';
  const duration = report?.duration ?? report?.metadata?.duration ?? 'Not available';
  const processingStatus = formatStatus(report?.status);

  const handleDownloadReport = () => {
    if (!report) {
      setDownloadMessage('No injury report is available yet. Complete an analysis first.');
      return;
    }

    try {
      downloadReportPdf(report, athleteName, videoName);
      setDownloadMessage('Report downloaded successfully.');
    } catch (error) {
      console.error('InjuryRiskReportPage: failed to download report', error);
      setDownloadMessage('Unable to download the report right now.');
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Movement Insights</p>
          <h1>Injury Risk Report</h1>
          <p className={styles.sub}>
            A concise overview of the current movement pattern, risk level, and recovery guidance from the latest analysis.
          </p>
        </header>

        {!report ? null : (
          <>
            <div className={`${styles.riskCard} ${riskDetails.className}`}>
              <div className={styles.riskBadge}>
                <span className={styles.riskLabel}>Risk Level</span>
                <div className={styles.statusPill}>
                  <span className={styles.statusIcon} aria-hidden="true">{riskDetails.icon}</span>
                  <h2>{riskLabel}</h2>
                </div>
              </div>
              {riskScore ? <p className={styles.riskScore}>Risk Score: {riskScore}</p> : null}
              <p className={styles.riskDescription}>{riskDescription}</p>
            </div>

            <div className={styles.detectedIssuesCard}>
              <div className={styles.sectionHeading}>
                <h3>Detected Issues</h3>
                <p>Movement patterns identified from the latest analysis.</p>
              </div>

              {detectedIssues.length ? (
                <ul className={styles.issueList}>
                  {detectedIssues.map((item) => (
                    <li key={item.label} className={item.type === 'issue' ? styles.issueItem : styles.normalItem}>
                      <span className={item.type === 'issue' ? styles.issueIcon : styles.normalIcon}>
                        {item.type === 'issue' ? '⚠' : '✓'}
                      </span>
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.emptyState}>✓ No significant movement issues detected.</p>
              )}
            </div>

            <div className={styles.summarySection}>
              <div className={styles.sectionHeading}>
                <h3>Analysis Summary</h3>
                <p>Key details from the latest processing session.</p>
              </div>

              <div className={styles.summaryGrid}>
                <article className={styles.summaryCard}>
                  <h4>Frames Processed</h4>
                  <p>{formatValue(framesProcessed)}</p>
                </article>
                <article className={styles.summaryCard}>
                  <h4>Duration</h4>
                  <p>{formatValue(duration)}</p>
                </article>
                <article className={styles.summaryCard}>
                  <h4>Processing Status</h4>
                  <p>{formatValue(processingStatus)}</p>
                </article>
              </div>
            </div>

            <div className={styles.recommendationsCard}>
              <div className={styles.sectionHeading}>
                <h3>Recommendations</h3>
                <p>Suggested actions to support safer movement and reduce strain.</p>
              </div>

              {recommendations.length ? (
                <ul className={styles.recommendationList}>
                  {recommendations.map((item) => (
                    <li key={item.key}>
                      <span className={styles.checkIcon}>✓</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.emptyState}>No recommendations available.</p>
              )}
            </div>

            <div className={styles.actions}>
              <Button type="button" variant="secondary" disabled={!report} onClick={handleDownloadReport}>
                Download Report
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/biomechanical-analysis')}>
                Back to Analysis
              </Button>
              <Button type="button" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
            {downloadMessage ? <p className={styles.downloadMessage}>{downloadMessage}</p> : null}
          </>
        )}
      </section>
    </div>
  );
}
