import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button/Button';
import { uploadVideo } from '../../services/api';
import styles from './UploadVideoPage.module.css';

const ACCEPTED_TYPES = ['.mp4', '.avi', '.mov'];
const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;

function formatFileSize(sizeInBytes) {
  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadVideoPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const isValidFile = useMemo(() => {
    if (!selectedFile) {
      return false;
    }

    const extension = `.${selectedFile.name.split('.').pop()?.toLowerCase() ?? ''}`;

    return (
      ACCEPTED_TYPES.includes(extension) &&
      selectedFile.size <= MAX_FILE_SIZE_BYTES
    );
  }, [selectedFile]);

  const handleFileSelection = (file) => {
    setUploadError('');

    if (!file) {
      return;
    }

    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;

    if (!ACCEPTED_TYPES.includes(extension)) {
      setUploadError(
        'Unsupported file format. Please upload MP4, AVI, or MOV.'
      );
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(
        'File is too large. Maximum supported size is 200 MB.'
      );
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleInputChange = (event) => {
    const [file] = event.target.files ?? [];
    handleFileSelection(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const [file] = event.dataTransfer.files ?? [];
    handleFileSelection(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError('');

    try {
      const currentUserId = window.sessionStorage.getItem('currentUserId');
      const response = await uploadVideo(selectedFile, currentUserId);

      const uploadData = {
        videoId: response.video_id,
        filename: response.filename,
        uploadedAt: new Date().toLocaleString(),
      };

      sessionStorage.setItem('uploadSuccessData', JSON.stringify(uploadData));
      sessionStorage.setItem('uploadedVideoId', response.video_id);
      sessionStorage.setItem('uploadedVideoName', selectedFile.name);

      navigate('/upload-success');
    } catch (error) {
      setUploadError(
        error.message || 'Video upload failed. Please try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setUploadError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.layout}>
      <section className={styles.card}>
        <div className={styles.header}>
          <h1>Upload Sports Video</h1>
          <p>Upload a sports video for pose estimation and injury analysis.</p>
        </div>

        <label
          className={`${styles.dropZone} ${
            selectedFile ? styles.dropZoneSelected : ''
          }`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.avi,.mov"
            onChange={handleInputChange}
            hidden
          />

          <div className={styles.dropZoneIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 15.25V4.75" />
              <path d="m7.75 9 4.25-4.25L16.25 9" />
              <path d="M5 16.75v1.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.5" />
            </svg>
          </div>

          <p className={styles.dropZoneTitle}>
            Drag & Drop your video
          </p>

          <p className={styles.dropZoneText}>or</p>

          <span className={styles.dropZoneButton}>
            Choose Video
          </span>

          <span className={styles.dropZoneHint}>
            MP4 • AVI • MOV • Max 200 MB
          </span>
        </label>

        {uploadError && (
          <p className={styles.errorMessage}>{uploadError}</p>
        )}

        {selectedFile && (
          <div className={styles.fileCard}>
            <div className={styles.fileInfo}>
              <p className={styles.fileName}>{selectedFile.name}</p>
              <p className={styles.fileSize}>
                {formatFileSize(selectedFile.size)}
              </p>
            </div>

            <div className={styles.cardActions}>
              <Button
                className={styles.primaryButton}
                onClick={handleAnalyze}
                disabled={!isValidFile || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload Video'}
              </Button>

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={resetSelection}
                disabled={isUploading}
              >
                Choose Another
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}