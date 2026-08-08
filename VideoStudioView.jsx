import React, { useState } from 'react';
import PoseCanvas from '../components/PoseCanvas';
import { MOTION_PRESETS } from '../data/mockData';
import { Video, Upload, Play, Cpu, CheckCircle2, ShieldAlert, Sparkles, Layers, Sliders } from 'lucide-react';

export default function VideoStudioView({ activeScan, onSelectScan, athletes }) {
  const [selectedPreset, setSelectedPreset] = useState(MOTION_PRESETS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState(100);
  const [selectedAthleteId, setSelectedAthleteId] = useState(athletes[0]?.id || 'ath-101');

  const handleSimulateUpload = () => {
    setIsProcessing(true);
    setPipelineProgress(25);

    setTimeout(() => setPipelineProgress(55), 600);
    setTimeout(() => setPipelineProgress(85), 1200);
    setTimeout(() => {
      setPipelineProgress(100);
      setIsProcessing(false);
    }, 1800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Studio Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Video size={24} color="var(--accent-cyan)" />
            AI Video Pose Analysis Studio & Scrubber
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            High-precision markerless motion capture, joint angular velocity calculation, and risk visualization.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            <Upload size={16} />
            <span>Upload Sports Video (.mp4 / .mov)</span>
            <input type="file" accept="video/*" onChange={handleSimulateUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Preset Selector Bar */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', overflowX: 'auto' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
          Motion Presets:
        </span>
        {MOTION_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => { setSelectedPreset(preset); handleSimulateUpload(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: selectedPreset.id === preset.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
              background: selectedPreset.id === preset.id ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255,255,255,0.03)',
              color: selectedPreset.id === preset.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: selectedPreset.id === preset.id ? 700 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <Sparkles size={14} />
            <span>{preset.title}</span>
            <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: preset.riskScore > 70 ? 'rgba(255,75,75,0.2)' : 'rgba(0,245,160,0.2)', color: preset.riskScore > 70 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
              Risk: {preset.riskScore}
            </span>
          </button>
        ))}
      </div>

      {/* Processing Loader Timeline if running */}
      {isProcessing && (
        <div className="glass-panel glass-panel-glow" style={{ padding: '20px', background: 'rgba(0, 242, 254, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cpu className="pulse-glow" size={20} color="var(--accent-cyan)" />
              <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>Executing AI Pose Keypoint Pipeline ({pipelineProgress}%)</span>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>60 FPS Frame Extraction</span>
          </div>

          <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pipelineProgress}%`, background: 'linear-gradient(90deg, #00F2FE 0%, #00F5A0 100%)', transition: 'width 0.4s ease' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '14px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <div style={{ color: pipelineProgress >= 25 ? 'var(--accent-emerald)' : 'inherit' }}>✓ Frame Extraction</div>
            <div style={{ color: pipelineProgress >= 55 ? 'var(--accent-emerald)' : 'inherit' }}>✓ COCO 17-Keypoint Mesh</div>
            <div style={{ color: pipelineProgress >= 85 ? 'var(--accent-emerald)' : 'inherit' }}>✓ Valgus Q-Angle Engine</div>
            <div style={{ color: pipelineProgress >= 100 ? 'var(--accent-emerald)' : 'inherit' }}>✓ Injury Score Vector</div>
          </div>
        </div>
      )}

      {/* Main Studio Display Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
        {/* Canvas Scrubber Component */}
        <PoseCanvas scanData={{ ...activeScan, overallRiskScore: selectedPreset.riskScore }} />

        {/* Telemetry & Biomechanical Metrics Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Target Athlete Selection */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
              Linked Athlete Subject
            </label>
            <select
              value={selectedAthleteId}
              onChange={(e) => setSelectedAthleteId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.sport} - {a.position})</option>
              ))}
            </select>
          </div>

          {/* Real-time Angle & Stress Breakdown */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} color="var(--accent-cyan)" />
              Biomechanical Vector Outputs
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Dynamic Knee Valgus (Right)</span>
                  <span style={{ color: selectedPreset.riskScore > 70 ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontWeight: 700 }}>
                    {selectedPreset.riskScore > 70 ? '16.8° (CRITICAL)' : '5.2° (NORMAL)'}
                  </span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: selectedPreset.riskScore > 70 ? '85%' : '25%', background: selectedPreset.riskScore > 70 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Trunk Hinge Angle</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>32.5° (Low Flexion)</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '45%', background: 'var(--accent-amber)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>GRF Landing Asymmetry</span>
                  <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>18.4% Imbalance</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '65%', background: 'var(--accent-amber)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* AI Recommended Physio Interventions */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '10px' }}>
              Automated Physiotherapy Protocol
            </h4>
            <ul style={{ paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Single-leg deceleration drills focusing on knee-toe alignment</li>
              <li>Gluteus medius isometric hip abduction loading</li>
              <li>Eccentric hamstring force production training (Nordic Hamstring Curls)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
