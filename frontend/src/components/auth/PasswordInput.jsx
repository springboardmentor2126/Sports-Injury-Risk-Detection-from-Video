import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import InputField from './InputField';
import styles from './AuthLayout.module.css';

export default function PasswordInput({ label, id, value, onChange, placeholder, autoComplete, error }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <InputField
      id={id}
      label={label}
      type={showPassword ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      error={error}
      rightSlot={
        <button
          type="button"
          className={styles.toggleButton}
          onClick={() => setShowPassword((current) => !current)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={16} strokeWidth={2.2} aria-hidden="true" /> : <Eye size={16} strokeWidth={2.2} aria-hidden="true" />}
        </button>
      }
    />
  );
}
