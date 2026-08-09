import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button/Button';
import styles from './UploadSuccessPage.module.css';

export default function UploadSuccessPage() {
  const navigate = useNavigate();
  const storedUpload = window.sessionStorage.getItem('uploadSuccessData');
  const uploadData = storedUpload ? JSON.parse(storedUpload) : null;

  return (
    <div className={styles.layout}>
      <section className={styles.card}>
        <div className={styles.iconWrapper} aria-hidden="true">
          <svg viewBox="0 0 24 24" className={styles.checkIcon}>
            <circle cx="12" cy="12" r="10" />
            <path d="M7.5 12.5l2.5 2.5 6-6" />
          </svg>
        </div>
        <div className={styles.header}>
          <h1>Video Uploaded Successfully</h1>
          <p>Your video is ready for the next step. You can upload another video or return to the dashboard.</p>
        </div>

        {uploadData ? (
          <div className={styles.detailsCard}>
            <p className={styles.detailsLabel}>Filename</p>
            <p className={styles.detailsValue}>{uploadData.filename}</p>
            <p className={styles.detailsLabel}>Uploaded</p>
            <p className={styles.detailsValue}>{uploadData.uploadedAt}</p>
            <p className={styles.detailsLabel}>Status</p>
            <p className={styles.detailsStatus}>Ready for Processing</p>
          </div>
        ) : (
          <div className={styles.detailsCard}>
            <p className={styles.detailsLabel}>No upload data available.</p>
          </div>
        )}

        <div className={styles.actions}>
          <Button className={styles.primaryButton} onClick={() => navigate('/upload-video')}>
            Upload Another Video
          </Button>
          <Button className={styles.primaryButton} onClick={() => navigate('/pose-estimation')}>
            Continue
          </Button>
          <Button className={styles.secondaryButton} variant="secondary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </section>
    </div>
  );
}
