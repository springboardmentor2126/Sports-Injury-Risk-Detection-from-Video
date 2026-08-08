import React, { useEffect, useRef, useState } from 'react';
import { generateSyntheticPoseFrame, SKELETON_CONNECTIONS, calculateAngle } from '../utils/poseCalculations';
import { Play, Pause, RotateCcw, AlertTriangle, Eye, ShieldAlert, CheckCircle } from 'lucide-react';

export default function PoseCanvas({ scanData }) {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);
  const totalFrames = scanData?.totalFrames || 180;
  const animFrameId = useRef(null);

  // Toggle play/pause animation
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      return;
    }

    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % totalFrames);
    }, 1000 / 30); // 30 FPS playback simulation

    return () => clearInterval(interval);
  }, [isPlaying, totalFrames]);

  // Render Skeleton onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background gradient (Simulated camera view)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0d1527');
    bgGrad.addColorStop(1, '#070a12');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
    
    // Grid lines for biomechanical reference
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Ground level line
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, height - 50);
    ctx.lineTo(width - 40, height - 50);
    ctx.stroke();

    // Generate Keypoint positions for this frame
    const pose = generateSyntheticPoseFrame(currentFrame, totalFrames, scanData?.overallRiskScore > 50 ? 'valgus' : 'normal');

    // Draw Skeleton Bones
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    
    SKELETON_CONNECTIONS.forEach(([p1Key, p2Key]) => {
      const p1 = pose[p1Key];
      const p2 = pose[p2Key];
      
      // Check if this connection involves the right knee (risk site)
      const isRiskBone = (p1Key === 'rightHip' && p2Key === 'rightKnee') || (p1Key === 'rightKnee' && p2Key === 'rightAnkle');
      
      if (isRiskBone && scanData?.overallRiskScore > 50 && currentFrame > totalFrames * 0.35 && currentFrame < totalFrames * 0.65) {
        ctx.strokeStyle = '#FF4B4B'; // Red highlight for valgus collapse
        ctx.shadowColor = '#FF4B4B';
        ctx.shadowBlur = 12;
      } else {
        ctx.strokeStyle = '#00F2FE'; // Cyan safe bone
        ctx.shadowColor = '#00F2FE';
        ctx.shadowBlur = 4;
      }
      
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Draw Joint Keypoint Circles
    Object.entries(pose).forEach(([key, pt]) => {
      const isKnee = key === 'rightKnee' || key === 'leftKnee';
      const isRightKneeRisk = key === 'rightKnee' && scanData?.overallRiskScore > 50;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isKnee ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = isRightKneeRisk ? '#FF4B4B' : '#00F5A0';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Calculate Real-time Angle (Right Hip - Right Knee - Right Ankle)
    const valgusAngle = calculateAngle(pose.rightHip, pose.rightKnee, pose.rightAnkle);

    // Draw Angle arc and textual HUD on canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText(`Frame: ${currentFrame}/${totalFrames}`, 20, 30);
    ctx.fillText(`Confidence: 97.4%`, 20, 50);

    // Overlay Dynamic Angle Label at Right Knee
    const rKnee = pose.rightKnee;
    const isImpactPhase = currentFrame > totalFrames * 0.35 && currentFrame < totalFrames * 0.65;
    
    ctx.fillStyle = isImpactPhase && valgusAngle < 165 ? '#FF4B4B' : '#00F2FE';
    ctx.fillRect(rKnee.x + 12, rKnee.y - 14, 110, 24);
    ctx.fillStyle = '#040D1A';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(`Knee: ${(180 - valgusAngle).toFixed(1)}° ${valgusAngle < 165 ? 'VALGUS!' : 'SAFE'}`, rKnee.x + 16, rKnee.y + 2);

  }, [currentFrame, totalFrames, scanData]);

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Studio Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={18} color="var(--accent-cyan)" />
            AI Pose Keypoint & Skeleton Overlay Stream
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>COCO 17-Keypoint Detection Model @ 60 FPS Camera Pipeline</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className={`badge ${scanData?.overallRiskScore > 70 ? 'badge-high' : 'badge-low'}`}>
            {scanData?.overallRiskScore > 70 ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
            {scanData?.riskLevel || 'High'} Risk ({scanData?.overallRiskScore || 78}/100)
          </span>
        </div>
      </div>

      {/* Canvas Player Box */}
      <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', background: '#04070F', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <canvas 
          ref={canvasRef} 
          width={440} 
          height={400} 
          style={{ width: '100%', maxWidth: '520px', height: '400px', display: 'block' }}
        />

        {/* Live HUD Floating Card */}
        <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(11,15,25,0.85)', backdropFilter: 'blur(8px)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px' }}>Biomechanical HUD</div>
          <div style={{ color: 'var(--text-secondary)' }}>Dynamic Valgus: <span style={{ color: scanData?.overallRiskScore > 50 ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontWeight: 700 }}>16.8° (High)</span></div>
          <div style={{ color: 'var(--text-secondary)' }}>Trunk Flexion: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>32.5°</span></div>
          <div style={{ color: 'var(--text-secondary)' }}>GRF Asymmetry: <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>18.4%</span></div>
        </div>
      </div>

      {/* Scrubber & Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ padding: '8px 14px' }}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            <span>{isPlaying ? 'Pause' : 'Play Video'}</span>
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={() => { setCurrentFrame(0); setIsPlaying(false); }}
            style={{ padding: '8px 14px' }}
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>

          <input 
            type="range" 
            min={0} 
            max={totalFrames - 1} 
            value={currentFrame} 
            onChange={(e) => { setCurrentFrame(Number(e.target.value)); setIsPlaying(false); }}
            style={{ flex: 1, accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
          />

          <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', minWidth: '65px' }}>
            {currentFrame} / {totalFrames}
          </span>
        </div>
      </div>
    </div>
  );
}
