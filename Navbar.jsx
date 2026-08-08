import React from 'react';
import RoleSelector from './RoleSelector';
import { Activity, Bell, Search, Video } from 'lucide-react';

export default function Navbar({ currentRole, onRoleChange, currentUser, onNewScanClick }) {
  return (
    <header style={{
      height: '70px',
      borderBottom: '1px solid var(--border-color)',
      background: 'rgba(11, 15, 25, 0.9)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <Activity size={22} color="#040D1A" strokeWidth={2.8} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px', background: 'linear-gradient(90deg, #FFFFFF 0%, #9CA3AF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            KINEMA<span style={{ color: 'var(--accent-cyan)', WebkitTextFillColor: 'var(--accent-cyan)' }}>RISK</span> <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(0, 242, 254, 0.3)', verticalAlign: 'middle', marginLeft: '6px' }}>v1.0 AI</span>
          </h1>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sports Injury Risk Detection & Biomechanics Engine</p>
        </div>
      </div>

      {/* Role Switcher */}
      <RoleSelector currentRole={currentRole} onRoleChange={onRoleChange} />

      {/* Right Action Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          className="btn btn-primary"
          onClick={onNewScanClick}
          style={{ fontSize: '0.82rem', padding: '8px 14px' }}
        >
          <Video size={16} />
          <span>New AI Scan</span>
        </button>

        <button 
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative'
          }}
          title="Notifications"
        >
          <Bell size={17} />
          <span style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-rose)' }}></span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '12px', borderLeft: '1px solid var(--border-color)' }}>
          <img 
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
            alt={currentUser?.name} 
            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid var(--accent-cyan)', objectFit: 'cover' }}
          />
          <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser?.name || 'Alex Rivera'}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>{currentRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
