import React from 'react';
import { USER_ROLES } from '../data/mockData';
import { 
  Users, 
  ShieldCheck, 
  Database, 
  CheckCircle2, 
  Video, 
  ArrowUpRight, 
  AlertTriangle, 
  Activity,
  Layers
} from 'lucide-react';

export default function DashboardView({ currentRole, athletes, scans, onSelectScan, onSelectAthlete, onNewScanClick }) {
  const highRiskAthletes = athletes.filter(a => a.overallRiskScore >= 70);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome & Role Banner */}
      <div className="glass-panel glass-panel-glow" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(18, 26, 43, 0.9) 0%, rgba(11, 15, 25, 0.95) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-cyan">{currentRole} Dashboard</span>
              <span className="badge badge-medium">Milestone 1 Architecture</span>
              <span style={{ fontSize: '0.75rem', background: 'rgba(255, 184, 0, 0.15)', color: 'var(--accent-amber)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255, 184, 0, 0.3)', fontWeight: 600 }}>
                Demo / Prototype Data
              </span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              Sports Injury Risk Detection Platform
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '680px' }}>
              Milestone 1 Core Setup: System architecture, authentication RBAC, athlete profile management, and pose estimation dataset collection.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={onNewScanClick}>
              <Video size={16} />
              <span>Upload Video Scan</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid - Optimized specifically for Milestone 1 Report Alignment */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
        {/* Card 1: Registered Athletes */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Registered Athletes</span>
            <Users size={20} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{athletes.length || 5}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: '4px' }}>Athlete profiles configured</div>
        </div>

        {/* Card 2: User Roles */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>User Roles</span>
            <ShieldCheck size={20} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>5</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: '4px' }}>RBAC configured</div>
        </div>

        {/* Card 3: Datasets Collected */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Datasets Collected</span>
            <Database size={20} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>5</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Pose & injury datasets identified</div>
        </div>

        {/* Card 4: System Setup */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--accent-emerald)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>System Setup</span>
            <CheckCircle2 size={20} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>100%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: '4px' }}>Frontend & backend initialized</div>
        </div>
      </div>

      {/* Main Content Split: High Risk Roster & Recent AI Scans */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        {/* High Risk Roster Panel */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="var(--accent-rose)" />
              Configured Athlete Baseline Profiles
            </h3>
            <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '4px' }}>
              Demo Roster Data
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {athletes.slice(0, 3).map((ath) => (
              <div 
                key={ath.id}
                onClick={() => onSelectAthlete(ath)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{ath.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>{ath.sport} • {ath.position}</div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {ath.primaryRiskFactors.map((rf, idx) => (
                      <span key={idx} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        {rf}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: ath.overallRiskScore >= 70 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                    {ath.overallRiskScore}
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Risk Baseline</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent AI Motion Video Scans */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Video size={18} color="var(--accent-cyan)" />
              Prototype Pose Estimation Samples
            </h3>
            <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '4px' }}>
              Demo Motion Video Data
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {scans.map((scan) => (
              <div 
                key={scan.id}
                onClick={() => onSelectScan(scan)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(79, 172, 254, 0.2) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(0, 242, 254, 0.3)'
                  }}>
                    <Video size={20} color="var(--accent-cyan)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>{scan.videoTitle}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{scan.athleteName} • {scan.motionType}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{scan.uploadDate}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <span className={`badge ${scan.overallRiskScore > 70 ? 'badge-high' : 'badge-low'}`}>
                      {scan.overallRiskScore > 70 ? 'High Risk' : 'Optimal'} ({scan.overallRiskScore})
                    </span>
                  </div>
                  <ArrowUpRight size={18} color="var(--text-muted)" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
