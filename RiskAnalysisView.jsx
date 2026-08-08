import React, { useState } from 'react';
import { USER_ROLES } from '../data/mockData';
import { Activity, ShieldAlert, CheckCircle, Dumbbell, Stethoscope, FilePlus, ChevronRight } from 'lucide-react';

export default function RiskAnalysisView({ currentRole, activeScan, athletes }) {
  const [selectedJoint, setSelectedJoint] = useState('Right Knee (ACL Strain)');
  const [newProtocolItem, setNewProtocolItem] = useState('');
  const [protocols, setProtocols] = useState([
    'Bilateral single-leg drop landing technique correction',
    'Gluteus Medius isometric band walks (3 sets x 15 reps)',
    'Eccentric hamstring loading (Nordic hamstring curls - 3 sets x 8 reps)',
    'Dynamic ankle dorsiflexion mobility & calf release'
  ]);

  const handleAddProtocol = (e) => {
    e.preventDefault();
    if (!newProtocolItem.trim()) return;
    setProtocols([...protocols, newProtocolItem.trim()]);
    setNewProtocolItem('');
  };

  const jointMatrix = [
    { name: 'Right Knee (ACL Strain)', riskScore: 82, status: 'Critical', angle: '16.8° Dynamic Valgus', detail: 'High shear force on anterior cruciate ligament during initial contact phase of landing.' },
    { name: 'Left Hamstring (Strain)', riskScore: 64, status: 'Warning', angle: '3.2:1 Quad/Hamstring Ratio', detail: 'Quadriceps dominance during decelerations causing hamstring over-eccentric stretch.' },
    { name: 'Lumbar Spine (L4-L5)', riskScore: 28, status: 'Normal', angle: '8.4° Extension', detail: 'Spinal kinematics within normal range of motion during vertical takeoff.' },
    { name: 'Right Ankle (Inversion)', riskScore: 42, status: 'Moderate', angle: '24° Dorsiflexion', detail: 'Slight lateral instability detected on ground impact.' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={24} color="var(--accent-rose)" />
            Biomechanical Risk Analytics & Physiotherapy Prescription
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Anatomical joint stress decomposition, ACL strain risk modeling, and role-based corrective protocols.
          </p>
        </div>

        <span className="badge badge-cyan">{currentRole} Mode</span>
      </div>

      {/* Joint Matrix & Diagnostic Inspector Split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Anatomical Joint Matrix */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Anatomical Joint Risk Matrix</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {jointMatrix.map((item) => (
              <div 
                key={item.name}
                onClick={() => setSelectedJoint(item.name)}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-sm)',
                  background: selectedJoint === item.name ? 'rgba(0, 242, 254, 0.1)' : 'rgba(255,255,255,0.03)',
                  border: selectedJoint === item.name ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{item.name}</span>
                  <span className={`badge ${item.riskScore > 70 ? 'badge-high' : item.riskScore > 40 ? 'badge-medium' : 'badge-low'}`}>
                    {item.status} ({item.riskScore}%)
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{item.angle}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{item.detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Physio Prescription & Corrective Exercises */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Stethoscope size={20} color="var(--accent-emerald)" />
              Clinical Physiotherapy Prescription
            </h3>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Selected Target Joint</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{selectedJoint}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Recommended focus: Reduce peak valgus strain on landing by strengthening gluteus medius and promoting knee-hip flexion synergy.
            </div>
          </div>

          {/* Corrective Exercise List */}
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
              Active Rehabilitation & Corrective Drills
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {protocols.map((proto, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.84rem' }}>
                  <Dumbbell size={16} color="var(--accent-emerald)" />
                  <span style={{ color: 'var(--text-primary)', flex: 1 }}>{proto}</span>
                </div>
              ))}
            </div>

            {/* Physio or Coach Add Protocol Input */}
            {(currentRole === USER_ROLES.PHYSIO || currentRole === USER_ROLES.SPORTS_SCIENTIST || currentRole === USER_ROLES.ADMIN || currentRole === USER_ROLES.COACH) && (
              <form onSubmit={handleAddProtocol} style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder="Add custom physio drill or load modification..."
                  value={newProtocolItem}
                  onChange={(e) => setNewProtocolItem(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#fff',
                    fontSize: '0.84rem'
                  }}
                />
                <button type="submit" className="btn btn-emerald" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                  <FilePlus size={16} />
                  <span>Prescribe</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
