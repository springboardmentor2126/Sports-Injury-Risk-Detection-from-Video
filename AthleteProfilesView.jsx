import React, { useState } from 'react';
import { USER_ROLES } from '../data/mockData';
import { Users, Plus, Search, Filter, Activity, AlertTriangle, Calendar, ChevronRight } from 'lucide-react';
import Modal from '../components/Modal';

export default function AthleteProfilesView({ athletes, onAddAthlete, currentRole, onSelectAthlete }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newAthlete, setNewAthlete] = useState({
    name: '',
    sport: 'Soccer',
    position: 'Forward',
    age: 22,
    gender: 'Male',
    heightCm: 180,
    weightKg: 75,
    bodyFatPct: 12,
    asymmetryIndexPct: 5.0,
    dominantLeg: 'Right',
    overallRiskScore: 35,
    primaryRiskFactors: ['Mild Hip Flexor Tightness'],
    status: 'Low Risk'
  });

  const sportsList = ['All', 'Soccer', 'Basketball', 'Track & Field', 'Weightlifting', 'Tennis'];

  const filteredAthletes = athletes.filter((ath) => {
    const matchesSearch = ath.name.toLowerCase().includes(searchQuery.toLowerCase()) || ath.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSport = selectedSport === 'All' || ath.sport === selectedSport;
    return matchesSearch && matchesSport;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddAthlete(newAthlete);
    setIsModalOpen(false);
    setNewAthlete({
      name: '',
      sport: 'Soccer',
      position: 'Forward',
      age: 22,
      gender: 'Male',
      heightCm: 180,
      weightKg: 75,
      bodyFatPct: 12,
      asymmetryIndexPct: 5.0,
      dominantLeg: 'Right',
      overallRiskScore: 35,
      primaryRiskFactors: ['Baseline Measurement'],
      status: 'Low Risk'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={24} color="var(--accent-cyan)" />
            Athlete Profile Roster Management
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Biomechanical baseline profiles, asymmetry index metrics, and medical injury history records.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>Register New Athlete</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input 
            type="text"
            placeholder="Search athlete by name or position..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.88rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Sport:</span>
          {sportsList.map((sport) => (
            <button
              key={sport}
              onClick={() => setSelectedSport(sport)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: selectedSport === sport ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                background: selectedSport === sport ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
                color: selectedSport === sport ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontWeight: selectedSport === sport ? 700 : 500
              }}
            >
              {sport}
            </button>
          ))}
        </div>
      </div>

      {/* Athlete Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {filteredAthletes.map((ath) => (
          <div 
            key={ath.id}
            className="glass-panel"
            style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              borderTop: `4px solid ${ath.overallRiskScore >= 70 ? 'var(--accent-rose)' : ath.overallRiskScore >= 45 ? 'var(--accent-amber)' : 'var(--accent-emerald)'}`
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{ath.name}</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>{ath.sport} • {ath.position}</div>
                </div>

                <span className={`badge ${ath.overallRiskScore >= 70 ? 'badge-high' : ath.overallRiskScore >= 45 ? 'badge-medium' : 'badge-low'}`}>
                  {ath.overallRiskScore >= 70 ? 'High Risk' : ath.overallRiskScore >= 45 ? 'Moderate' : 'Optimal'} ({ath.overallRiskScore})
                </span>
              </div>

              {/* Physical Telemetry Table */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.8rem', marginBottom: '14px' }}>
                <div>Age / Gender: <strong style={{ color: 'var(--text-primary)' }}>{ath.age} y/o ({ath.gender[0]})</strong></div>
                <div>Height / Weight: <strong style={{ color: 'var(--text-primary)' }}>{ath.heightCm}cm / {ath.weightKg}kg</strong></div>
                <div>Body Fat: <strong style={{ color: 'var(--text-primary)' }}>{ath.bodyFatPct}%</strong></div>
                <div>Asymmetry Index: <strong style={{ color: ath.asymmetryIndexPct > 7 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>{ath.asymmetryIndexPct}%</strong></div>
              </div>

              {/* Primary Risk Factors */}
              <div style={{ fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Biomechanical Focus:</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {ath.primaryRiskFactors.map((rf, idx) => (
                    <span key={idx} style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      {rf}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Card Action */}
            <div style={{ pt: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Last Scan: {ath.lastScanDate}</span>
              <button 
                className="btn btn-secondary" 
                onClick={() => onSelectAthlete(ath)}
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              >
                <span>Full Kinematic File</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Register Athlete Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register New Athlete Profile">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Athlete Full Name</label>
            <input 
              type="text" 
              required 
              value={newAthlete.name} 
              onChange={(e) => setNewAthlete({...newAthlete, name: e.target.value})} 
              style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }} 
              placeholder="e.g. Marcus Rashford"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Sport Category</label>
              <select 
                value={newAthlete.sport} 
                onChange={(e) => setNewAthlete({...newAthlete, sport: e.target.value})} 
                style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }}
              >
                <option value="Soccer">Soccer</option>
                <option value="Basketball">Basketball</option>
                <option value="Track & Field">Track & Field</option>
                <option value="Weightlifting">Weightlifting</option>
                <option value="Tennis">Tennis</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Position / Event</label>
              <input 
                type="text" 
                required 
                value={newAthlete.position} 
                onChange={(e) => setNewAthlete({...newAthlete, position: e.target.value})} 
                style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Age</label>
              <input 
                type="number" 
                value={newAthlete.age} 
                onChange={(e) => setNewAthlete({...newAthlete, age: Number(e.target.value)})} 
                style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }} 
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Height (cm)</label>
              <input 
                type="number" 
                value={newAthlete.heightCm} 
                onChange={(e) => setNewAthlete({...newAthlete, heightCm: Number(e.target.value)})} 
                style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }} 
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Weight (kg)</label>
              <input 
                type="number" 
                value={newAthlete.weightKg} 
                onChange={(e) => setNewAthlete({...newAthlete, weightKg: Number(e.target.value)})} 
                style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Athlete Profile</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
