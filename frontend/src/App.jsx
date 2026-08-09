import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import LoginPage from './pages/Login/LoginPage';
import SignupPage from './pages/Signup/SignupPage';
import AthleteProfilePage from './pages/AthleteProfile/AthleteProfilePage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import UploadVideoPage from './pages/UploadVideo/UploadVideoPage';
import UploadSuccessPage from './pages/UploadVideo/UploadSuccessPage';
import PoseEstimationPage from './pages/PoseEstimation/PoseEstimationPage';
import PoseEstimationResultsPage from './pages/PoseEstimation/PoseEstimationResultsPage';
import BiomechanicalAnalysisPage from './pages/BiomechanicalAnalysis/BiomechanicalAnalysisPage';
import InjuryRiskReportPage from './pages/InjuryRiskReport/InjuryRiskReport';
import AthleteIntelligenceDashboardPage from './pages/AthleteIntelligenceDashboard/AthleteIntelligenceDashboardPage';
import AnalysisHistoryPage from './pages/AnalysisHistory/AnalysisHistoryPage';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import { createAthleteProfile, getAthleteProfile, loginUser, signupUser, updateAthleteProfile } from './services/api';

function PrivateRoute({ isAuthenticated, children }) {
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

function AthleteOnlyRoute({ isAuthenticated, role, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Only athletes can enter the profile flow; every other role is sent to the dashboard.
  if (role !== 'athlete') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentRole, setCurrentRole] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUserId = window.sessionStorage.getItem('currentUserId');
    const storedUserRole = window.sessionStorage.getItem('currentUserRole');
    const storedUserName =
      window.sessionStorage.getItem('currentUserName') ||
      window.sessionStorage.getItem('athleteName') ||
      window.sessionStorage.getItem('profileName') ||
      '';

    if (storedUserId && !Number.isNaN(Number(storedUserId))) {
      setIsAuthenticated(true);
      setCurrentUserId(Number(storedUserId));
      setCurrentUserName(storedUserName);
      setCurrentRole(storedUserRole || 'athlete');
    }

    setIsAuthLoaded(true);
  }, []);

  const appActions = useMemo(
    () => ({
      login: async (credentials) => {
        const response = await loginUser(credentials);
        const role = response.role || 'athlete';
        const profileExists = Boolean(response.profile_exists);
        const fullName = typeof response.full_name === 'string' ? response.full_name.trim() : '';

        setIsAuthenticated(true);
        setCurrentRole(role);
        setCurrentUserId(response.user_id);
        setCurrentUserName(fullName);
        window.sessionStorage.setItem('currentUserId', String(response.user_id));
        window.sessionStorage.setItem('currentUserRole', role);
        window.sessionStorage.setItem('currentUserName', fullName);
        window.sessionStorage.setItem('athleteName', fullName);
        window.sessionStorage.setItem('profileName', fullName);
        setProfileCompleted(profileExists);
        navigate(role === 'athlete' && !profileExists ? '/athlete-profile' : '/dashboard', { replace: true });
      },
      signup: async (account) => {
        const response = await signupUser(account);
        const role = response.role || account.role;
        const fullName = typeof response.full_name === 'string' ? response.full_name.trim() : '';

        setProfileCompleted(false);
        setCurrentRole(role);
        setCurrentUserId(response.user_id);
        setCurrentUserName(fullName);
        window.sessionStorage.setItem('currentUserId', String(response.user_id));
        window.sessionStorage.setItem('currentUserRole', role);
        window.sessionStorage.setItem('currentUserName', fullName);
        window.sessionStorage.setItem('athleteName', fullName);
        window.sessionStorage.setItem('profileName', fullName);
        setIsAuthenticated(true);
        navigate(role === 'athlete' ? '/athlete-profile' : '/dashboard', { replace: true });
      },
      logout: () => {
        setIsAuthenticated(false);
        setCurrentRole('');
        setCurrentUserId(null);
        setCurrentUserName('');
        window.sessionStorage.removeItem('currentUserId');
        window.sessionStorage.removeItem('currentUserRole');
        window.sessionStorage.removeItem('currentUserName');
        window.sessionStorage.removeItem('athleteName');
        window.sessionStorage.removeItem('profileName');
        setProfileCompleted(false);
        navigate('/login', { replace: true });
      },
      saveProfile: async (profile) => {
        if (!currentUserId) {
          throw new Error('Unable to save profile because the logged-in user was not found.');
        }

        const basePayload = {
          user_id: currentUserId,
          full_name: profile.fullName.trim(),
          age: Number(profile.age),
          gender: profile.gender,
          height: profile.height.trim(),
          weight: profile.weight.trim(),
          sport: profile.sport.trim(),
          playing_position: profile.playingPosition.trim(),
          dominant_side: profile.dominantSide,
          experience_years: Number(profile.experienceYears),
          previous_injuries: profile.previousInjuries.trim(),
        };

        let shouldUpdateProfile = Boolean(profileCompleted);

        if (!shouldUpdateProfile) {
          try {
            const existingProfile = await getAthleteProfile(currentUserId);
            shouldUpdateProfile = Boolean(existingProfile);
          } catch (error) {
            if (!String(error?.message || '').includes('not found')) {
              throw error;
            }
          }
        }

        if (shouldUpdateProfile) {
          let existingProfile = null;
          try {
            existingProfile = await getAthleteProfile(currentUserId);
          } catch (error) {
            if (!String(error?.message || '').includes('not found')) {
              throw error;
            }
          }

          const patchPayload = {};
          const fieldMap = {
            full_name: 'fullName',
            age: 'age',
            gender: 'gender',
            height: 'height',
            weight: 'weight',
            sport: 'sport',
            playing_position: 'playingPosition',
            dominant_side: 'dominantSide',
            experience_years: 'experienceYears',
            previous_injuries: 'previousInjuries',
          };

          Object.entries(fieldMap).forEach(([apiField, formField]) => {
            const currentValue = existingProfile?.[apiField];
            const nextValue = basePayload[apiField];
            const normalizedCurrent = currentValue === null || currentValue === undefined ? '' : String(currentValue);
            const normalizedNext = nextValue === null || nextValue === undefined ? '' : String(nextValue);

            if (normalizedCurrent !== normalizedNext) {
              patchPayload[apiField] = nextValue;
            }
          });

          if (Object.keys(patchPayload).length > 0) {
            await updateAthleteProfile(currentUserId, patchPayload);
          }
        } else {
          await createAthleteProfile(basePayload);
        }

        setProfileCompleted(true);
        navigate('/dashboard', { replace: true });
      },
    }),
    [currentUserId, navigate, profileCompleted],
  );

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage onLogin={appActions.login} />} />
      <Route path="/signup" element={<SignupPage onSignup={appActions.signup} />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <div className="app-shell">
              <Navbar onLogout={appActions.logout} />
              <main className="app-shell__content">
                <DashboardPage role={currentRole} onLogout={appActions.logout} />
              </main>
              <Footer />
            </div>
          </PrivateRoute>
        }
      />
      <Route
        path="/athlete-profile"
        element={
          <AthleteOnlyRoute isAuthenticated={isAuthenticated} role={currentRole}>
            <div className="app-shell">
              <Navbar onLogout={appActions.logout} />
              <main className="app-shell__content">
                <AthleteProfilePage
                  userId={currentUserId}
                  profileSaved={profileCompleted}
                  onSaveProfile={appActions.saveProfile}
                />
              </main>
              <Footer />
            </div>
          </AthleteOnlyRoute>
        }
      />
      <Route
        path="/upload-video"
        element={
          <AthleteOnlyRoute isAuthenticated={isAuthenticated} role={currentRole}>
            <div className="app-shell">
              <Navbar onLogout={appActions.logout} />
              <main className="app-shell__content">
                <UploadVideoPage />
              </main>
              <Footer />
            </div>
          </AthleteOnlyRoute>
        }
      />
      <Route
        path="/analysis-history"
        element={
          <AthleteOnlyRoute isAuthenticated={isAuthenticated} role={currentRole}>
            <div className="app-shell">
              <Navbar onLogout={appActions.logout} />
              <main className="app-shell__content">
                <AnalysisHistoryPage />
              </main>
              <Footer />
            </div>
          </AthleteOnlyRoute>
        }
      />
      <Route
        path="/upload-success"
        element={
          <AthleteOnlyRoute isAuthenticated={isAuthenticated} role={currentRole}>
            <div className="app-shell">
              <Navbar onLogout={appActions.logout} />
              <main className="app-shell__content">
                <UploadSuccessPage />
              </main>
              <Footer />
            </div>
          </AthleteOnlyRoute>
        }
      />
      <Route
        path="/pose-estimation"
        element={
          <AthleteOnlyRoute isAuthenticated={isAuthenticated} role={currentRole}>
            <div className="app-shell">
              <Navbar onLogout={appActions.logout} />
              <main className="app-shell__content">
                <PoseEstimationPage />
              </main>
              <Footer />
            </div>
          </AthleteOnlyRoute>
        }
      />
      <Route
        path="/pose-estimation-results"
        element={
          <AthleteOnlyRoute isAuthenticated={isAuthenticated} role={currentRole}>
            <div className="app-shell">
              <Navbar onLogout={appActions.logout} />
              <main className="app-shell__content">
                <PoseEstimationResultsPage />
              </main>
              <Footer />
            </div>
          </AthleteOnlyRoute>
        }
      />
      <Route
        path="/biomechanical-analysis"
        element={
          <AthleteOnlyRoute isAuthenticated={isAuthenticated} role={currentRole}>
            <div className="app-shell">
              <Navbar onLogout={appActions.logout} />
              <main className="app-shell__content">
                <BiomechanicalAnalysisPage />
              </main>
              <Footer />
            </div>
          </AthleteOnlyRoute>
        }
      />
      <Route
        path="/injury-risk-report"
        element={
          <AthleteOnlyRoute isAuthenticated={isAuthenticated} role={currentRole}>
            <div className="app-shell">
              <Navbar onLogout={appActions.logout} />
              <main className="app-shell__content">
                <InjuryRiskReportPage />
              </main>
              <Footer />
            </div>
          </AthleteOnlyRoute>
        }
      />
      <Route
        path="/athlete-intelligence-dashboard"
        element={
          <AthleteOnlyRoute isAuthenticated={isAuthenticated} role={currentRole}>
            <div className="app-shell">
              <Navbar onLogout={appActions.logout} />
              <main className="app-shell__content">
                <AthleteIntelligenceDashboardPage />
              </main>
              <Footer />
            </div>
          </AthleteOnlyRoute>
        }
      />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
