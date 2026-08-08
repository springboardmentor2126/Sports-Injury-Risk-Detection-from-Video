import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal';

import DashboardView from './views/DashboardView';
import AthleteProfilesView from './views/AthleteProfilesView';
import VideoStudioView from './views/VideoStudioView';
import RiskAnalysisView from './views/RiskAnalysisView';
import DatasetsView from './views/DatasetsView';
import ReportsView from './views/ReportsView';

import { INITIAL_USERS, INITIAL_ATHLETES, MOCK_VIDEO_SCANS, USER_ROLES } from './data/mockData';
import { Upload, Video, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState(USER_ROLES.PHYSIO);
  const [currentUser, setCurrentUser] = useState(INITIAL_USERS[1]); // Dr. Marcus Vance
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [athletes, setAthletes] = useState(INITIAL_ATHLETES);
  const [scans, setScans] = useState(MOCK_VIDEO_SCANS);
  
  const [selectedScan, setSelectedScan] = useState(MOCK_VIDEO_SCANS[0]);
  const [selectedAthlete, setSelectedAthlete] = useState(INITIAL_ATHLETES[0]);

  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Handle role change
  const handleRoleChange = (newRole) => {
    setCurrentRole(newRole);
    const matchedUser = INITIAL_USERS.find((u) => u.role === newRole) || INITIAL_USERS[0];
    setCurrentUser(matchedUser);
  };

  // Handle adding new athlete
  const handleAddAthlete = (newAthleteData) => {
    const created = {
      ...newAthleteData,
      id: `ath-${Date.now()}`,
      injuryHistory: [],
      lastScanDate: new Date().toISOString().split('T')[0]
    };
    setAthletes([created, ...athletes]);
  };

  // Handle selecting athlete for detail view
  const handleSelectAthlete = (ath) => {
    setSelectedAthlete(ath);
    setActiveTab('athletes');
  };

  // Handle selecting scan for studio view
  const handleSelectScan = (scan) => {
    setSelectedScan(scan);
    setActiveTab('studio');
  };

  const handleSimulateNewScanUpload = (e) => {
    e.preventDefault();
    if (!uploadedFileName) return;

    const newScanObj = {
      id: `scan-${Date.now()}`,
      athleteId: selectedAthlete.id,
      athleteName: selectedAthlete.name,
      videoTitle: uploadedFileName.replace(/\.[^/.]+$/, ""),
      motionType: 'Side-step Cutting / Jump',
      uploadDate: new Date().toLocaleString(),
      fps: 60,
      totalFrames: 180,
      overallRiskScore: 74,
      riskLevel: 'High',
      jointBreakdown: {
        kneeValgusAngleRight: 15.4,
        kneeValgusAngleLeft: 5.8,
        hipHingeFlexion: 34.0,
        groundReactionForceAsymmetry: 16.2,
        peakAngularVelocity: 395
      },
      detectedJointRisks: [
        { joint: 'Right Knee (ACL Strain)', severity: 'Critical', detail: 'Dynamic valgus collapse detected.' }
      ],
      correctiveProtocol: [
        'Neuromuscular Single-Leg Stabilization Drills'
      ]
    };

    setScans([newScanObj, ...scans]);
    setSelectedScan(newScanObj);
    setIsScanModalOpen(false);
    setUploadedFileName('');
    setActiveTab('studio');
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="main-content">
        {/* Sticky Top Header */}
        <Navbar 
          currentRole={currentRole} 
          onRoleChange={handleRoleChange} 
          currentUser={currentUser}
          onNewScanClick={() => setIsScanModalOpen(true)}
        />

        {/* Page Content View */}
        <main className="page-wrapper">
          {activeTab === 'dashboard' && (
            <DashboardView 
              currentRole={currentRole}
              athletes={athletes}
              scans={scans}
              onSelectScan={handleSelectScan}
              onSelectAthlete={handleSelectAthlete}
              onNewScanClick={() => setIsScanModalOpen(true)}
            />
          )}

          {activeTab === 'athletes' && (
            <AthleteProfilesView 
              athletes={athletes}
              onAddAthlete={handleAddAthlete}
              currentRole={currentRole}
              onSelectAthlete={handleSelectAthlete}
            />
          )}

          {activeTab === 'studio' && (
            <VideoStudioView 
              activeScan={selectedScan}
              onSelectScan={setSelectedScan}
              athletes={athletes}
            />
          )}

          {activeTab === 'risk' && (
            <RiskAnalysisView 
              currentRole={currentRole}
              activeScan={selectedScan}
              athletes={athletes}
            />
          )}

          {activeTab === 'datasets' && (
            <DatasetsView />
          )}

          {activeTab === 'reports' && (
            <ReportsView 
              activeScan={selectedScan}
              activeAthlete={selectedAthlete}
            />
          )}
        </main>
      </div>

      {/* New Scan Upload Modal */}
      <Modal isOpen={isScanModalOpen} onClose={() => setIsScanModalOpen(false)} title="Upload Athlete Sports Video for AI Processing">
        <form onSubmit={handleSimulateNewScanUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Select Monitored Athlete</label>
            <select
              value={selectedAthlete.id}
              onChange={(e) => {
                const found = athletes.find(a => a.id === e.target.value);
                if (found) setSelectedAthlete(found);
              }}
              style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontWeight: 600 }}
            >
              {athletes.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.sport})</option>
              ))}
            </select>
          </div>

          <div style={{
            border: '2px dashed var(--accent-cyan)',
            padding: '30px',
            borderRadius: '10px',
            textAlign: 'center',
            background: 'rgba(0, 242, 254, 0.03)',
            cursor: 'pointer'
          }}>
            <Upload size={32} color="var(--accent-cyan)" style={{ marginBottom: '10px' }} />
            <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>Drag & Drop Sports Motion Video</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Supports MP4, MOV, AVI up to 4K @ 120 FPS</div>
            
            <input 
              type="file"
              accept="video/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setUploadedFileName(e.target.files[0].name);
                }
              }}
              style={{ marginTop: '14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}
            />
          </div>

          {uploadedFileName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald)', fontSize: '0.84rem' }}>
              <CheckCircle2 size={16} />
              <span>Ready for frame extraction: {uploadedFileName}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsScanModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!uploadedFileName}>
              <Video size={16} />
              <span>Process AI Pose Keypoints</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
