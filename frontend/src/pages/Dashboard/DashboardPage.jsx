import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button/Button';
import styles from './DashboardPage.module.css';

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Profile icon">
      <path d="M12 12.25a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Z" />
      <path d="M4.75 20.25a7.25 7.25 0 0 1 14.5 0" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Upload icon">
      <path d="M12 15.25V4.75" />
      <path d="m7.75 9 4.25-4.25L16.25 9" />
      <path d="M5 16.75v1.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.5" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Report icon">
      <path d="M5.75 19.25V13" />
      <path d="M12 19.25V8.75" />
      <path d="M18.25 19.25V5.25" />
      <path d="M4.5 19.25h15" />
    </svg>
  );
}

const athleteCards = [
  {
    icon: <UserIcon />,
    title: 'Athlete Profile',
    description: 'View and update your personal information.',
    actionLabel: 'Open Profile',
    route: '/athlete-profile',
  },
  {
    icon: <UploadIcon />,
    title: 'Upload Video',
    description: 'Upload sports videos for AI pose estimation and injury risk analysis.',
    actionLabel: 'Upload Video',
    route: '/upload-video',
  },
  {
    icon: <ReportIcon />,
    title: 'Previous Analyses',
    description: 'View previous reports and analysis history.',
    actionLabel: 'View Reports',
    route: '/analysis-history',
  },
  {
    icon: <ReportIcon />,
    title: 'Athlete Intelligence Dashboard',
    description: 'Review the latest injury risk summary, issues, recommendations, and previous analyses in one place.',
    actionLabel: 'Open Dashboard',
    route: '/athlete-intelligence-dashboard',
  },
];

function DashboardActionCard({ icon, title, description, actionLabel, onClick, disabled = false }) {
  return (
    <article className={styles.actionCard}>
      <div className={styles.iconWrap} aria-hidden="true">
        {icon}
      </div>
      <div className={styles.cardBody}>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className={styles.cardButtonWrap}>
        <Button className={styles.cardButton} variant="primary" onClick={onClick} disabled={disabled}>
          {actionLabel}
        </Button>
      </div>
    </article>
  );
}

export default function DashboardPage({ role = '', onLogout }) {
  const navigate = useNavigate();
  const normalizedRole = role.toLowerCase();
  const isAthlete = normalizedRole === 'athlete';
  const displayName = typeof window !== 'undefined'
    ? (window.sessionStorage.getItem('currentUserName') || window.sessionStorage.getItem('athleteName') || window.sessionStorage.getItem('profileName') || '').trim()
    : '';
  const dashboardTitle = displayName ? `${displayName}'s Dashboard` : 'Dashboard';

  if (!isAthlete) {
    return (
      <div className={styles.layout}>
        <section className={styles.placeholderCard}>
          <p className={styles.kicker}>Dashboard</p>
          <h2>Welcome to the sports injury risk detection dashboard.</h2>
          <p className={styles.description}>
            {role ? `Signed in as ${role.replace('-', ' ')}.` : 'Your role will determine the available workflow here.'}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <section className={styles.dashboardShell}>
        <header className={styles.topBar}>
          <div className={styles.brandBlock}>
            <div className={styles.brandIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M5 19.25h14" />
                <path d="M8.25 19.25v-5.5" />
                <path d="M12 19.25v-8.5" />
                <path d="M15.75 19.25v-3.5" />
                <path d="M7 7.5h10" />
              </svg>
            </div>
            <div>
              <p className={styles.brandName}>Sports Injury Risk Detection</p>
              <p className={styles.brandSubtitle}>{dashboardTitle}</p>
            </div>
          </div>
        </header>

        <section className={styles.welcomeCard}>
          <div className={styles.welcomeContent}>
            <h2>{displayName ? `Welcome Back, ${displayName} 👋` : 'Welcome Back 👋'}</h2>
            <p>Manage your athlete profile, upload sports videos, and track your injury analysis progress.</p>
          </div>
        </section>

        <div className={styles.cardGrid}>
          {athleteCards.map((card) => (
            <DashboardActionCard
              key={card.title}
              {...card}
              onClick={() => (card.route ? navigate(card.route) : undefined)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
