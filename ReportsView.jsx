import React from 'react';
import { triggerPrintReport, formatTimestamp } from '../utils/reportGenerator';
import { Printer, Download, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

export default function ReportsView({ activeScan, activeAthlete }) {
  const currentAthlete = activeAthlete || {
    name: 'Alex Rivera',
    sport: 'Soccer',
    position: 'Winger / Forward',
    age: 23,
    gender: 'Male',
    heightCm: 182,
    weightKg: 76,
    overallRiskScore: 78,
    asymmetryIndexPct: 8.2,
    lastScanDate: '2026-08-05'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Controls (Hidden on Print) */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={24} color="var(--accent-cyan)" />
            Clinical Diagnostic & Kinematic Report Generator
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Official sports medicine diagnostic summary formatted for medical staff and athletic directors.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={triggerPrintReport}>
            <Printer size={16} />
            <span>Print Diagnostic Report</span>
          </button>
        </div>
      </div>

      {/* Printable Clinical Report Paper Document */}
      <div className="glass-panel" style={{ padding: '36px', background: '#0D1322', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
        {/* Document Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-color)', paddingBottom: '20px', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)', letterSpacing: '-0.5px' }}>
              KINEMARISK AI MEDICAL DIAGNOSTICS
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Center for Sports Biomechanics & Computer Vision Analytics
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Report Reference ID: #KMR-2026-08-789
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className={`badge ${currentAthlete.overallRiskScore > 70 ? 'badge-high' : 'badge-low'}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
              {currentAthlete.overallRiskScore > 70 ? 'CRITICAL RISK ALERT' : 'OPTIMAL MECHANICS'}
            </span>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              Date Issued: {formatTimestamp(currentAthlete.lastScanDate)}
            </div>
          </div>
        </div>

        {/* Athlete Kinematic Profile Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Athlete Name</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{currentAthlete.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sport & Position</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{currentAthlete.sport} ({currentAthlete.position})</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Physical Profile</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{currentAthlete.heightCm}cm / {currentAthlete.weightKg}kg</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Limb Asymmetry</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: currentAthlete.asymmetryIndexPct > 7 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
              {currentAthlete.asymmetryIndexPct}% Imbalance
            </div>
          </div>
        </div>

        {/* Biomechanical Risk Assessment Summary */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} />
            Biomechanical Joint Parameter Findings
          </h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '10px' }}>Joint Parameter</th>
                <th style={{ padding: '10px' }}>Measured Value</th>
                <th style={{ padding: '10px' }}>Clinical Normal Range</th>
                <th style={{ padding: '10px' }}>Risk Assessment</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px', color: '#fff', fontWeight: 600 }}>Dynamic Knee Valgus (Right)</td>
                <td style={{ padding: '10px', color: 'var(--accent-rose)', fontWeight: 700 }}>16.8° (Medial Collapse)</td>
                <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>&lt; 10.0°</td>
                <td style={{ padding: '10px' }}><span className="badge badge-high">High ACL Strain</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px', color: '#fff', fontWeight: 600 }}>Trunk Flexion at Impact</td>
                <td style={{ padding: '10px', color: 'var(--accent-amber)', fontWeight: 700 }}>32.5° (Stiff Landing)</td>
                <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>45.0° - 60.0°</td>
                <td style={{ padding: '10px' }}><span className="badge badge-medium">Elevated Ground Shear</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px', color: '#fff', fontWeight: 600 }}>GRF Asymmetry Ratio</td>
                <td style={{ padding: '10px', color: 'var(--accent-amber)', fontWeight: 700 }}>18.4% (Right Favored)</td>
                <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>&lt; 8.0%</td>
                <td style={{ padding: '10px' }}><span className="badge badge-medium">Asymmetrical Loading</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Clinical Recommendation & Signature */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Attending Physiotherapist Prescribed Intervention
          </h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px' }}>
            Athlete demonstrates significant dynamic knee valgus during single-leg decelerations. Immediate 3-week neuromuscular intervention prescribed focusing on hip abduction strength (Gluteus Medius), trunk flexion mechanics, and eccentric hamstring loading before returning to full-contact matches.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Dr. Marcus Vance, DPT, SCS</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lead Sports Physiotherapist & Kinematics Director</div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              Verified via KinemaRisk AI Engine v1.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
