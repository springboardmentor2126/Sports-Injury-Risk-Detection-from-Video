import styles from './Sidebar.module.css';

export default function Sidebar({ active = 'profile' }) {
  const items = [
    { key: 'overview', label: 'Overview' },
    { key: 'profile', label: 'Athlete Profile' },
    { key: 'records', label: 'Training Records' },
    { key: 'injury-history', label: 'Injury History' },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarCard}>
        <p className={styles.cardLabel}>Workspace</p>
        <h2 className={styles.heading}>Dashboard Operations</h2>
        <p className={styles.description}>Profile data is stored locally for this milestone and will later connect to prediction services.</p>
      </div>
      <nav className={styles.nav} aria-label="Profile sections">
        {items.map((item) => (
          <span key={item.key} className={`${styles.navItem} ${active === item.key ? styles.active : ''}`}>
            {item.label}
          </span>
        ))}
      </nav>
    </aside>
  );
}
