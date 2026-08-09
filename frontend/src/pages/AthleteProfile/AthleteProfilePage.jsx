import { useEffect, useState } from 'react';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import { getAthleteProfile } from '../../services/api';
import styles from './AthleteProfilePage.module.css';

const genderOptions = [
  { value: '', label: 'Select gender', disabled: true },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
  { value: 'other', label: 'Other' },
];

const initialFormState = {
  fullName: '',
  age: '',
  gender: '',
  height: '',
  weight: '',
  sport: '',
  playingPosition: '',
  dominantSide: '',
  experienceYears: '',
  previousInjuries: '',
};

const dominantSideOptions = [
  { value: '', label: 'Select dominant side', disabled: true },
  { value: 'right', label: 'Right' },
  { value: 'left', label: 'Left' },
  { value: 'both', label: 'Both' },
];

function mapApiProfileToForm(profile) {
  return {
    fullName: profile.full_name || '',
    age: profile.age?.toString() || '',
    gender: profile.gender || '',
    height: profile.height || '',
    weight: profile.weight || '',
    sport: profile.sport || '',
    playingPosition: profile.playing_position || '',
    dominantSide: profile.dominant_side || '',
    experienceYears: profile.experience_years?.toString() || '',
    previousInjuries: profile.previous_injuries || '',
  };
}

export default function AthleteProfilePage({ userId, profileSaved, onSaveProfile }) {
  const [formData, setFormData] = useState(initialFormState);
  const [savedFormData, setSavedFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [localStatus, setLocalStatus] = useState('');
  const resolvedUserId = userId ?? window.sessionStorage.getItem('currentUserId');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!resolvedUserId) {
        setFormData(initialFormState);
        setSavedFormData(initialFormState);
        setLocalStatus('');
        return;
      }

      try {
        const profile = await getAthleteProfile(resolvedUserId);
        if (!isMounted) return;

        const nextFormData = mapApiProfileToForm(profile);
        setFormData(nextFormData);
        setSavedFormData(nextFormData);
        setLocalStatus('Loaded saved profile. You can update your details below.');
      } catch (error) {
        if (!isMounted) return;

        setFormData(initialFormState);
        setSavedFormData(initialFormState);
        setLocalStatus(error.message || 'Unable to load saved profile details.');
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [profileSaved, resolvedUserId]);

  const handleReset = () => {
    setFormData(savedFormData);
    setErrors({});
    setLocalStatus('Form reset to the last saved values.');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!formData.fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!formData.age.trim()) nextErrors.age = 'Age is required.';
    if (!formData.gender.trim()) nextErrors.gender = 'Gender is required.';
    if (!formData.height.trim()) nextErrors.height = 'Height is required.';
    if (!formData.weight.trim()) nextErrors.weight = 'Weight is required.';
    if (!formData.sport.trim()) nextErrors.sport = 'Sport is required.';
    if (!formData.playingPosition.trim()) nextErrors.playingPosition = 'Playing position is required.';
    if (!formData.dominantSide.trim()) nextErrors.dominantSide = 'Dominant side is required.';
    if (!formData.experienceYears.trim()) nextErrors.experienceYears = 'Experience years is required.';
    if (!formData.previousInjuries.trim()) nextErrors.previousInjuries = 'Previous injury history is required.';

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setLocalStatus('');
      return;
    }

    try {
      if (onSaveProfile) {
        await onSaveProfile(formData, !profileSaved);
      }

      setLocalStatus(profileSaved ? 'Profile updated successfully.' : 'Profile saved. Redirecting to dashboard...');
    } catch (error) {
      setLocalStatus(error.message || 'Unable to save profile. Please try again.');
    }
  };

  return (
    <div className={styles.layout}>
      <section className={styles.content}>
        <div className={styles.headerCard}>
          <div>
            <p className={styles.sectionLabel}>Athlete Profile</p>
            <h2>Complete the athlete details before future injury analysis.</h2>
          </div>
          {profileSaved ? <span className={styles.savedBadge}>Saved to database</span> : null}
        </div>

        <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
          <div className={styles.actionsTop}>
            <Button type="button" variant="secondary" onClick={handleReset}>
              Reset Form
            </Button>
          </div>

          <div className={styles.formGrid}>
            <Input id="fullName" label="Full Name" value={formData.fullName} onChange={handleChange} placeholder="Enter full name" error={errors.fullName} />
            <Input id="age" label="Age" type="number" value={formData.age} onChange={handleChange} placeholder="Enter age" error={errors.age} />
            <Input id="gender" label="Gender" as="select" value={formData.gender} onChange={handleChange} error={errors.gender} options={genderOptions} />
            <Input id="height" label="Height" value={formData.height} onChange={handleChange} placeholder="e.g. 178 cm" error={errors.height} />
            <Input id="weight" label="Weight" value={formData.weight} onChange={handleChange} placeholder="e.g. 72 kg" error={errors.weight} />
            <Input id="sport" label="Sport" value={formData.sport} onChange={handleChange} placeholder="e.g. Football" error={errors.sport} />
            <Input id="playingPosition" label="Playing Position" value={formData.playingPosition} onChange={handleChange} placeholder="e.g. Defender" error={errors.playingPosition} />
            <Input id="dominantSide" label="Dominant Side" as="select" value={formData.dominantSide} onChange={handleChange} error={errors.dominantSide} options={dominantSideOptions} />
            <Input id="experienceYears" label="Experience Years" type="number" value={formData.experienceYears} onChange={handleChange} placeholder="e.g. 4" error={errors.experienceYears} />
            
            <label className={styles.field} htmlFor="previousInjuries" style={{ gridColumn: 'span 2' }}>
              <span className={styles.label}>Previous Injury History</span>
              <textarea
                id="previousInjuries"
                name="previousInjuries"
                className={`${styles.textarea} ${errors.previousInjuries ? styles.inputError : ''}`}
                value={formData.previousInjuries}
                onChange={handleChange}
                placeholder="Describe any past injuries or rehabilitation history"
                aria-invalid={Boolean(errors.previousInjuries)}
                aria-describedby={errors.previousInjuries ? 'previousInjuries-error' : undefined}
              />
              {errors.previousInjuries ? (
                <span className={styles.error} id="previousInjuries-error">
                  {errors.previousInjuries}
                </span>
              ) : null}
            </label>
          </div>

          {/* This container handles positioning the button right below the grid */}
          <div className={styles.actionsBottom} style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              className={styles.primaryAction}
              style={{ 
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)', 
                color: '#ffffff', 
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                padding: '0.75rem 2rem'
              }}
            >
              Submit Profile
            </Button>
          </div>

          {localStatus ? <p className={styles.status} style={{ marginTop: '1rem', textAlign: 'right' }}>{localStatus}</p> : null}
        </form>
      </section>
    </div>
  );
}
