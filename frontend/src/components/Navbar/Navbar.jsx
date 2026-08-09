import styles from './Navbar.module.css';
import Button from '../Button/Button';
import Logo from '../auth/Logo';

export default function Navbar({ onLogout }) {
  return (
    <header className={styles.navbar}>
      <div className={styles.brand}>
        <Logo className={styles.brandLogo} size={48} />
        <div>
          <p className={styles.kicker}>Sports Injury Risk Detection</p>
          <h1 className={styles.title}>Athlete Dashboard</h1>
        </div>
      </div>
      <Button variant="secondary" onClick={onLogout}>
        Logout
      </Button>
    </header>
  );
}
