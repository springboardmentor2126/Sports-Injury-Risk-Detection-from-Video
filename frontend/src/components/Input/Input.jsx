import styles from './Input.module.css';

export default function Input({ label, error, id, type = 'text', value, onChange, placeholder, rightSlot, autoComplete, as = 'input', options = [], ...rest }) {
  const control = as === 'select' ? (
    <select
      className={`${styles.input} ${error ? styles.inputError : ''}`}
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      {...rest}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  ) : (
    <input
      className={`${styles.input} ${error ? styles.inputError : ''}`}
      id={id}
      name={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      {...rest}
    />
  );

  return (
    <label className={styles.field} htmlFor={id}>
      <span className={styles.labelRow}>
        <span className={styles.label}>{label}</span>
        {rightSlot}
      </span>
      {control}
      {error ? (
        <span className={styles.error} id={`${id}-error`}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
