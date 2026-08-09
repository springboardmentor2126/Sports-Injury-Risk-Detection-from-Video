const PROFILE_COMPLETED_KEY = 'profileCompleted';
const PROFILE_DATA_KEY = 'athleteProfileData';

function normalizeUserKey(userEmail) {
  return userEmail?.trim().toLowerCase();
}

function getScopedKey(baseKey, userEmail) {
  const normalizedEmail = normalizeUserKey(userEmail);
  return normalizedEmail ? `${baseKey}:${normalizedEmail}` : baseKey;
}

export function getProfileCompletedStatus(userEmail) {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(getScopedKey(PROFILE_COMPLETED_KEY, userEmail)) === 'true';
}

export function setProfileCompletedStatus(completed, userEmail) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getScopedKey(PROFILE_COMPLETED_KEY, userEmail), completed ? 'true' : 'false');
}

export function clearProfileCompletedStatus(userEmail) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(getScopedKey(PROFILE_COMPLETED_KEY, userEmail));
}

export function getStoredProfile(userEmail) {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawProfile = window.localStorage.getItem(getScopedKey(PROFILE_DATA_KEY, userEmail));
  if (!rawProfile) {
    return null;
  }

  try {
    return JSON.parse(rawProfile);
  } catch {
    return null;
  }
}

export function setStoredProfile(profile, userEmail) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getScopedKey(PROFILE_DATA_KEY, userEmail), JSON.stringify(profile));
}

export function clearStoredProfile(userEmail) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(getScopedKey(PROFILE_DATA_KEY, userEmail));
}
