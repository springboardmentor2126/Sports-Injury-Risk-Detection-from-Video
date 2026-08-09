import styles from './Button.module.css';

export default function Button({ children, type = 'button', variant = 'primary', onClick, disabled = false, className = '', style }) {
  return (
    <button className={`${styles.button} ${styles[variant]} ${className}`.trim()} type={type} onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  );
}
