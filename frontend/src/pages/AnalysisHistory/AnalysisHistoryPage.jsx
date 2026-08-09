import { useEffect, useMemo, useState } from 'react';
import { getAnalysisHistory } from '../../services/api';
import styles from './AnalysisHistoryPage.module.css';

export default function AnalysisHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentUserId = window.sessionStorage.getItem('currentUserId');

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      setError('Please log in to view your history.');
      return;
    }

    let cancelled = false;

    async function loadHistory() {
      try {
        const entries = await getAnalysisHistory(currentUserId);
        if (!cancelled) {
          setHistory(entries || []);
          setLoading(false);
        }
      } catch (historyError) {
        if (!cancelled) {
          setError(historyError.message || 'Unable to load analysis history.');
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const rows = useMemo(() => {
    if (!Array.isArray(history)) {
      return [];
    }

    return [...history].sort((a, b) => {
      const left = new Date(a.analysis_time || a.created_at || 0).getTime();
      const right = new Date(b.analysis_time || b.created_at || 0).getTime();
      return right - left;
    });
  }, [history]);

  return (
    <div className={styles.layout}>
      <section className={styles.card}>
        <p className={styles.kicker}>Reports</p>
        <h2>Previous Analyses</h2>
        <p className={styles.description}>Your permanent history from PostgreSQL, sorted from newest to oldest.</p>

        {loading ? (
          <div className={styles.statusBox}>Loading history...</div>
        ) : null}

        {!loading && error ? (
          <div className={styles.statusBox}>{error}</div>
        ) : null}

        {!loading && !error && rows.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Video Name</th>
                  <th>Risk Score</th>
                  <th>Risk Level</th>
                  <th>Total Issues</th>
                  <th>Processing Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.history_id ?? item.analysis_id}>
                    <td>{item.analysis_time ? new Date(item.analysis_time).toLocaleString() : new Date(item.created_at).toLocaleString()}</td>
                    <td>{item.video_name || item.video_id || 'N/A'}</td>
                    <td>{item.risk_score ?? 'No data available'}</td>
                    <td>{item.risk_level ?? 'Low'}</td>
                    <td>{item.total_issues ?? '0'}</td>
                    <td>{item.processing_status || item.status || 'Completed'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !error && !rows.length ? (
          <div className={styles.statusBox}>No previous analyses available.</div>
        ) : null}
      </section>
    </div>
  );
}
