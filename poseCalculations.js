// Biomechanical Calculations & Pose Mesh Helper Functions

/**
 * Calculates 2D angle (in degrees) between three points: A (Origin), B (Vertex), C (End)
 * e.g., Hip -> Knee -> Ankle gives Knee Flexion / Valgus lateral angle
 */
export function calculateAngle(p1, p2, p3) {
  if (!p1 || !p2 || !p3) return 0;
  
  const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  
  if (angle > 180.0) {
    angle = 360.0 - angle;
  }
  return Math.round(angle * 10) / 10;
}

/**
 * Evaluates injury risk level based on biomechanical indicators
 */
export function evaluateInjuryRisk({ kneeValgusRight, kneeValgusLeft, hipHingeFlexion, grfAsymmetry }) {
  let score = 20; // Baseline low risk
  
  // Right knee valgus penalty (> 10 deg triggers elevated risk)
  if (kneeValgusRight > 15) score += 35;
  else if (kneeValgusRight > 10) score += 18;
  
  // Left knee valgus penalty
  if (kneeValgusLeft > 15) score += 35;
  else if (kneeValgusLeft > 10) score += 18;
  
  // Stiff landing penalty (low hip flexion < 35 deg)
  if (hipHingeFlexion < 30) score += 20;
  
  // Asymmetry penalty (> 10% imbalance)
  if (grfAsymmetry > 15) score += 20;
  else if (grfAsymmetry > 8) score += 10;
  
  score = Math.min(99, Math.max(10, score));
  
  let level = 'Low';
  if (score >= 70) level = 'High';
  else if (score >= 45) level = 'Moderate';
  
  return { score, level };
}

/**
 * Generates synthetic frame-by-frame 2D skeleton keypoint coordinates for canvas animation
 * Keypoints format: 17 COCO keypoints (Nose, Shoulders, Elbows, Wrists, Hips, Knees, Ankles)
 */
export function generateSyntheticPoseFrame(frameIndex, totalFrames, riskType = 'valgus') {
  const t = (frameIndex % totalFrames) / totalFrames; // normalized 0 to 1
  const cycle = Math.sin(t * Math.PI * 2);
  const landingImpact = Math.sin(t * Math.PI);
  
  // Center of canvas: 400x400
  const cx = 200;
  const cy = 120 + landingImpact * 40; // Vertical displacement during landing
  
  // Valgus collapse offset for right knee during impact
  const valgusOffset = riskType === 'valgus' ? (landingImpact > 0.4 ? (landingImpact - 0.4) * 45 : 0) : 0;
  
  return {
    nose: { x: cx, y: cy - 60 },
    leftShoulder: { x: cx - 35, y: cy - 30 },
    rightShoulder: { x: cx + 35, y: cy - 30 },
    leftElbow: { x: cx - 55 + cycle * 10, y: cy },
    rightElbow: { x: cx + 55 - cycle * 10, y: cy },
    leftWrist: { x: cx - 65 + cycle * 15, y: cy + 30 },
    rightWrist: { x: cx + 65 - cycle * 15, y: cy + 30 },
    
    leftHip: { x: cx - 25, y: cy + 60 },
    rightHip: { x: cx + 25, y: cy + 60 },
    
    leftKnee: { x: cx - 28 - cycle * 5, y: cy + 130 + landingImpact * 15 },
    rightKnee: { x: cx + 28 - valgusOffset, y: cy + 130 + landingImpact * 15 }, // Medial collapse inwards
    
    leftAnkle: { x: cx - 32, y: cy + 200 },
    rightAnkle: { x: cx + 32, y: cy + 200 }
  };
}

export const SKELETON_CONNECTIONS = [
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle']
];
