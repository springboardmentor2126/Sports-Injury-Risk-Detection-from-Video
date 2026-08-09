import styles from './AuthLayout.module.css';

export default function InputField({
  label,
  error,
  id,
  as = 'input',
  type = 'text',
  value,
  onChange,
  placeholder,
  rightSlot,
  autoComplete,
  options = [],
  ...rest
}) {
  const control = as === 'select' ? (
    <select
      className={`${styles.select} ${error ? styles.inputError : ''}`}
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
    <div className={styles.inputShell}>
      <input
        className={`${styles.input} ${rightSlot ? styles.inputWithIcon : ''} ${error ? styles.inputError : ''}`}
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
      {rightSlot ? <div className={styles.inputSlot}>{rightSlot}</div> : null}
    </div>
  );

  return (
    <label className={styles.field} htmlFor={id}>
      <span className={styles.labelRow}>
        <span className={styles.label}>{label}</span>
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
