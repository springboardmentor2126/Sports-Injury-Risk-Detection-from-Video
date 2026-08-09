import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Button from '../../components/Button/Button';
import AuthLayout from '../../components/auth/AuthLayout';
import FormHeader from '../../components/auth/FormHeader';
import InputField from '../../components/auth/InputField';
import PasswordInput from '../../components/auth/PasswordInput';
import { isStrongPassword, isValidEmail } from '../../utils/validation';
import authStyles from '../../components/auth/AuthLayout.module.css';
import styles from './SignupPage.module.css';

const roleOptions = [
  { value: '', label: 'Select your role', disabled: true },
  { value: 'athlete', label: 'Athlete' },
  { value: 'coach', label: 'Coach' },
  { value: 'physiotherapist', label: 'Physiotherapist' },
  { value: 'sports-scientist', label: 'Sports Scientist' },
  { value: 'admin', label: 'Admin' },
];

export default function SignupPage({ onSignup }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
  });
  const [errors, setErrors] = useState({});
  const [submitMessage, setSubmitMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!formData.fullName.trim()) {
      nextErrors.fullName = 'Enter your full name.';
    }

    if (!isValidEmail(formData.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!isStrongPassword(formData.password)) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    if (formData.confirmPassword !== formData.password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!formData.role) {
      nextErrors.role = 'Select a role.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSubmitMessage('');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitMessage('');

      if (onSignup) {
        await onSignup({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
        });

        return;
      }

      navigate(formData.role === 'athlete' ? '/athlete-profile' : '/dashboard', { replace: true });
    } catch (error) {
      setSubmitMessage(error.message || 'Unable to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <form className={authStyles.formGrid} onSubmit={handleSubmit} noValidate>
        <FormHeader title="Create Account"  />

        <InputField
          id="fullName"
          label="Full Name"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Enter your full name"
          autoComplete="name"
          error={errors.fullName}
        />

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
          placeholder="Create a password"
          autoComplete="new-password"
          error={errors.password}
        />

        <PasswordInput
          id="confirmPassword"
          label="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          error={errors.confirmPassword}
        />

        <InputField
          as="select"
          id="role"
          label="Role"
          value={formData.role}
          onChange={handleChange}
          error={errors.role}
          options={roleOptions}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className={authStyles.loginButton}
          style={{ background: '#2563eb', color: '#ffffff', width: '100%', borderRadius: '16px', boxShadow: '0 16px 28px rgba(37, 99, 235, 0.18)' }}
        >
          <span>{isSubmitting ? 'Creating account...' : 'Create Account'}</span>
          {!isSubmitting ? <ArrowRight size={16} strokeWidth={2.4} aria-hidden="true" className={authStyles.buttonIcon} /> : null}
        </Button>

        {submitMessage ? <p className={authStyles.message}>{submitMessage}</p> : null}

        <p className={styles.footerText}>
          Already have an account? <Link className={styles.footerLink} to="/login">Login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
