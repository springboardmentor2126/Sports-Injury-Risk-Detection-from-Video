import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Video, 
  Activity, 
  Database, 
  FileText, 
  Settings, 
  HelpCircle 
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'athletes', label: 'Athlete Profiles', icon: Users },
    { id: 'studio', label: 'AI Pose Studio', icon: Video, badge: 'LIVE' },
    { id: 'risk', label: 'Risk Analytics & Physio', icon: Activity },
    { id: 'datasets', label: 'Datasets & AI Models', icon: Database },
    { id: 'reports', label: 'Clinical Reports', icon: FileText }
  ];

  return (
    <aside style={{
      width: '240px',
      borderRight: '1px solid var(--border-color)',
      background: 'rgba(11, 15, 25, 0.6)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '24px 16px',
      height: 'calc(100vh - 70px)',
      position: 'sticky',
      top: '70px'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 700, padding: '0 12px 8px 12px' }}>
          Platform Navigation
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.15) 0%, rgba(79, 172, 254, 0.05) 100%)' : 'transparent',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                borderLeft: isActive ? '3px solid var(--accent-cyan)' : '3px solid transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={18} color={isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span style={{ fontSize: '0.65rem', background: 'var(--accent-cyan)', color: '#040D1A', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Activity size={14} color="var(--accent-emerald)" />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>Engine Status</span>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>COCO 17-Keypoint & Human3.6M 3D Pose Mesh Active</div>
      </div>
    </aside>
  );
}
