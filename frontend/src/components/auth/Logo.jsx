import styles from './AuthLayout.module.css';

export default function Logo({ className = '', markClassName = '', size = 46 }) {
  return (
    <div className={`${styles.logo} ${className}`.trim()} aria-label="Sports Injury Risk Detection logo">
      <div className={`${styles.logoMark} ${markClassName}`.trim()} style={{ width: size, height: size }}>
        <img className={styles.logoImage} src="/logo.png" alt="Sports Injury Risk Detection" />
      </div>
    </div>
  );
}
