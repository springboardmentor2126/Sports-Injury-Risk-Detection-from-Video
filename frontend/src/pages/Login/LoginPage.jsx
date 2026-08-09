import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Button from '../../components/Button/Button';
import AuthLayout from '../../components/auth/AuthLayout';
import FormHeader from '../../components/auth/FormHeader';
import InputField from '../../components/auth/InputField';
import PasswordInput from '../../components/auth/PasswordInput';
import { isStrongPassword, isValidEmail } from '../../utils/validation';
import authStyles from '../../components/auth/AuthLayout.module.css';
import styles from './LoginPage.module.css';

export default function LoginPage({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitMessage, setSubmitMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!isValidEmail(formData.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!isStrongPassword(formData.password)) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSubmitMessage('');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitMessage('');
      await onLogin({
        email: formData.email,
        password: formData.password,
      });
      setSubmitMessage('Login successful. Redirecting to athlete profile...');
    } catch (error) {
      setSubmitMessage(error.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <form className={authStyles.formGrid} onSubmit={handleSubmit} noValidate>
        <FormHeader title="Welcome Back" subtitle="Sign in to continue to your dashboard." />

        <InputField
          id="email"
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email}
        />

        <PasswordInput
          id="password"
          label="Password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password}
        />

        <div className={authStyles.metaRow}>
          {/* <label className={authStyles.checkboxRow}>
            <input name="rememberMe" type="checkbox" checked={formData.rememberMe} onChange={handleChange} />
            <span>Remember Me</span>
          </label> */}

          {/* <button type="button" className={authStyles.forgotLink}>
            Forgot Password?
          </button> */}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className={authStyles.loginButton}
          style={{ background: '#2563eb', color: '#ffffff', width: '100%', borderRadius: '16px', boxShadow: '0 16px 28px rgba(37, 99, 235, 0.18)' }}
        >
          <span>{isSubmitting ? 'Logging in...' : 'Login'}</span>
          {!isSubmitting ? <ArrowRight size={16} strokeWidth={2.4} aria-hidden="true" className={authStyles.buttonIcon} /> : null}
        </Button>

        {submitMessage ? <p className={authStyles.message}>{submitMessage}</p> : null}

        <p className={styles.footerText}>
          Don&apos;t have an account? <Link className={styles.footerLink} to="/signup">Sign Up</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
