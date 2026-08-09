import styles from './AuthLayout.module.css';

export default function FormHeader({ title, subtitle }) {
  return (
    <div className={styles.cardHeader}>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}
