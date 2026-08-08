// Mock Data for Sports Injury Risk Detection Platform

export const USER_ROLES = {
  ATHLETE: 'Athlete',
  COACH: 'Coach',
  PHYSIO: 'Physiotherapist',
  SPORTS_SCIENTIST: 'Sports Scientist',
  ADMIN: 'Administrator'
};

export const INITIAL_USERS = [
  { id: 'u1', name: 'Alex Rivera', role: USER_ROLES.ATHLETE, email: 'alex.rivera@athletics.com', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  { id: 'u2', name: 'Dr. Marcus Vance', role: USER_ROLES.PHYSIO, email: 'marcus.vance@sportsmed.org', avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150' },
  { id: 'u3', name: 'Coach Sarah Jenkins', role: USER_ROLES.COACH, email: 'sarah.j@fcpro.com', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
  { id: 'u4', name: 'Prof. Elena Rostova', role: USER_ROLES.SPORTS_SCIENTIST, email: 'elena.rostova@biomech.edu', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150' },
  { id: 'u5', name: 'David Kim (Admin)', role: USER_ROLES.ADMIN, email: 'admin@kinemarisk.ai', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' }
];

export const INITIAL_ATHLETES = [
  {
    id: 'ath-101',
    name: 'Alex Rivera',
    sport: 'Soccer',
    position: 'Winger / Forward',
    age: 23,
    gender: 'Male',
    heightCm: 182,
    weightKg: 76,
    bodyFatPct: 10.4,
    asymmetryIndexPct: 8.2, // Left vs Right leg imbalance
    dominantLeg: 'Right',
    injuryHistory: [
      { date: '2025-04-12', type: 'Right Hamstring Strain (Grade 1)', recoveryDays: 21 },
      { date: '2024-11-05', type: 'Left Ankle Lateral Sprain', recoveryDays: 14 }
    ],
    overallRiskScore: 78, // High
    primaryRiskFactors: ['Dynamic Knee Valgus (Right Leg)', 'Ground Reaction Force Asymmetry'],
    lastScanDate: '2026-08-05',
    status: 'High Risk'
  },
  {
    id: 'ath-102',
    name: 'Elena Vance',
    sport: 'Basketball',
    position: 'Point Guard',
    age: 21,
    gender: 'Female',
    heightCm: 175,
    weightKg: 65,
    bodyFatPct: 14.2,
    asymmetryIndexPct: 3.5,
    dominantLeg: 'Right',
    injuryHistory: [
      { date: '2025-01-20', type: 'Patellar Tendonitis', recoveryDays: 10 }
    ],
    overallRiskScore: 32, // Low
    primaryRiskFactors: ['Mild Hip Flexor Tightness'],
    lastScanDate: '2026-08-06',
    status: 'Low Risk'
  },
  {
    id: 'ath-103',
    name: 'Marcus Sterling',
    sport: 'Track & Field',
    position: '100m Sprint',
    age: 25,
    gender: 'Male',
    heightCm: 188,
    weightKg: 83,
    bodyFatPct: 8.8,
    asymmetryIndexPct: 6.1,
    dominantLeg: 'Left',
    injuryHistory: [
      { date: '2025-08-10', type: 'Left ACL Tear (Post-Rehab Year 2)', recoveryDays: 240 }
    ],
    overallRiskScore: 61, // Moderate
    primaryRiskFactors: ['Asymmetrical Sprint Acceleration Peak Force'],
    lastScanDate: '2026-08-04',
    status: 'Moderate Risk'
  },
  {
    id: 'ath-104',
    name: 'Sophia Chen',
    sport: 'Weightlifting',
    position: '63kg Category',
    age: 22,
    gender: 'Female',
    heightCm: 162,
    weightKg: 62.5,
    bodyFatPct: 16.0,
    asymmetryIndexPct: 2.1,
    dominantLeg: 'Right',
    injuryHistory: [],
    overallRiskScore: 24, // Low
    primaryRiskFactors: ['Optimal Spine Kinematics'],
    lastScanDate: '2026-08-07',
    status: 'Low Risk'
  },
  {
    id: 'ath-105',
    name: 'Jamal Washington',
    sport: 'Tennis',
    position: 'Single / Double',
    age: 26,
    gender: 'Male',
    heightCm: 185,
    weightKg: 79,
    bodyFatPct: 11.2,
    asymmetryIndexPct: 9.8,
    dominantLeg: 'Right',
    injuryHistory: [
      { date: '2025-06-18', type: 'Right Shoulder Rotator Cuff Overuse', recoveryDays: 30 }
    ],
    overallRiskScore: 72, // High
    primaryRiskFactors: ['Lumbar Hyperextension on Serve', 'Scapular Dyskinesis'],
    lastScanDate: '2026-08-06',
    status: 'High Risk'
  }
];

export const MOCK_VIDEO_SCANS = [
  {
    id: 'scan-301',
    athleteId: 'ath-101',
    athleteName: 'Alex Rivera',
    videoTitle: 'Single Leg Drop Landing & Cut Test',
    motionType: 'Drop Jump / Cutting',
    uploadDate: '2026-08-05 14:30',
    fps: 60,
    totalFrames: 180,
    overallRiskScore: 78,
    riskLevel: 'High',
    jointBreakdown: {
      kneeValgusAngleRight: 16.8, // Normal < 10 deg; high risk > 15 deg
      kneeValgusAngleLeft: 6.2,
      hipHingeFlexion: 32.5, // Low trunk flexion increases ACL shear force
      groundReactionForceAsymmetry: 18.4, // %
      peakAngularVelocity: 420 // deg/sec
    },
    detectedJointRisks: [
      { joint: 'Right Knee (ACL Strain)', severity: 'Critical', detail: 'Dynamic valgus medial collapse of 16.8° recorded frame 84.' },
      { joint: 'Hamstring Co-Contraction', severity: 'Warning', detail: 'Quad-to-hamstring activation ratio 3.2:1 during landing phase.' },
      { joint: 'Ankle Dorsiflexion', severity: 'Normal', detail: 'Adequate range of motion (28°).' }
    ],
    correctiveProtocol: [
      'Neuromuscular Single-Leg Stabilization Drills (3x/week)',
      'Gluteus Medius Isometric Strengthening & Banded Monster Walks',
      'Soft-Landing Plyometric retraining emphasizing hip hinge flex'
    ]
  },
  {
    id: 'scan-302',
    athleteId: 'ath-102',
    athleteName: 'Elena Vance',
    videoTitle: 'Vertical Jump Kinematics Analysis',
    motionType: 'Countermovement Jump',
    uploadDate: '2026-08-06 09:15',
    fps: 60,
    totalFrames: 120,
    overallRiskScore: 32,
    riskLevel: 'Low',
    jointBreakdown: {
      kneeValgusAngleRight: 5.1,
      kneeValgusAngleLeft: 4.8,
      hipHingeFlexion: 45.0,
      groundReactionForceAsymmetry: 3.2,
      peakAngularVelocity: 310
    },
    detectedJointRisks: [
      { joint: 'Bilateral Knees', severity: 'Normal', detail: 'Symmetrical alignment throughout takeoff and descent.' },
      { joint: 'Spine Posture', severity: 'Normal', detail: 'Neutral spinal posture maintained during landing.' }
    ],
    correctiveProtocol: [
      'Maintain current conditioning program',
      'Add routine calf and patellar tendon eccentric load loading'
    ]
  }
];

export const MOTION_PRESETS = [
  { id: 'preset-1', title: 'Single-Leg Drop Landing (ACL Stress Test)', riskScore: 78, type: 'Jump / Landing' },
  { id: 'preset-2', title: '100m Sprint Acceleration Mechanics', riskScore: 61, type: 'Sprinting' },
  { id: 'preset-3', title: 'Barbell Deep Squat Kinematics', riskScore: 24, type: 'Weightlifting' },
  { id: 'preset-4', title: 'Tennis Serve Shoulder & Spine Rotation', riskScore: 72, type: 'Rotational Overhead' }
];
