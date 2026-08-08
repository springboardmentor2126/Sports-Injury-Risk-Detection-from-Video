import React from 'react';
import { USER_ROLES } from '../data/mockData';
import { ShieldCheck, User, Stethoscope, Dumbbell, Activity } from 'lucide-react';

export default function RoleSelector({ currentRole, onRoleChange }) {
  const roles = [
    { name: USER_ROLES.ATHLETE, icon: Dumbbell, color: 'text-emerald-400', label: 'Athlete View' },
    { name: USER_ROLES.COACH, icon: Activity, color: 'text-amber-400', label: 'Coach Portal' },
    { name: USER_ROLES.PHYSIO, icon: Stethoscope, color: 'text-rose-400', label: 'Physiotherapist' },
    { name: USER_ROLES.SPORTS_SCIENTIST, icon: User, color: 'text-cyan-400', label: 'Sports Scientist' },
    { name: USER_ROLES.ADMIN, icon: ShieldCheck, color: 'text-purple-400', label: 'Administrator' }
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 600 }}>
        Role Context:
      </span>
      <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
        {roles.map((r) => {
          const Icon = r.icon;
          const isActive = currentRole === r.name;
          return (
            <button
              key={r.name}
              onClick={() => onRoleChange(r.name)}
              title={`Switch to ${r.label}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: isActive ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(79, 172, 254, 0.2) 100%)' : 'transparent',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: isActive ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid transparent'
              }}
            >
              <Icon size={14} />
              <span>{r.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
