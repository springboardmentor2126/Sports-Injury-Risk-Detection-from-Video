import { NavLink } from 'react-router-dom';
import styles from './AuthLayout.module.css';
import HeroSection from './HeroSection';

export default function AuthLayout({ children }) {
  return (
    <main className={styles.page}>
      <div className={styles.topRightActions}>
        <div className={styles.authPill}>
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `${styles.authLink} ${isActive ? styles.authLinkActive : styles.authLinkInactive}`
            }
          >
            Login
          </NavLink>
          <NavLink
            to="/signup"
            className={({ isActive }) =>
              `${styles.authLink} ${isActive ? styles.authLinkActive : styles.authLinkInactive}`
            }
          >
            Sign Up
          </NavLink>
        </div>
      </div>

      <div className={styles.authShell}>
        <HeroSection />
        <section className={styles.formPanel}>
          <div className={styles.card}>{children}</div>
        </section>
      </div>
    </main>
  );
}
