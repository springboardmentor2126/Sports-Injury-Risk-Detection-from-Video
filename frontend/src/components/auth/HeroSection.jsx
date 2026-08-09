import Logo from './Logo';
import styles from './AuthLayout.module.css';

export default function HeroSection() {
  return (
    <section className={styles.heroPanel}>
      <div className={styles.heroContent}>
        <div className={styles.brandRow}>
          <Logo />
          <h1 className={styles.projectName}>SPORTS INJURY RISK DETECTION</h1>
        </div>
      </div>
    </section>
  );
}
