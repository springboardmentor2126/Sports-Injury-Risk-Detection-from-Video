import React, { useState } from 'react';
import { DATASETS } from '../data/datasetInfo';
import { Database, Cpu, CheckCircle2, Award, Zap, BookOpen } from 'lucide-react';

export default function DatasetsView() {
  const [selectedDataset, setSelectedDataset] = useState(DATASETS[0]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-cyan">Milestone 1 Core Task #8</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Dataset Collection & AI Model Benchmarks</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={24} color="var(--accent-cyan)" />
            AI Computer Vision Datasets & Model Benchmarks
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Reviewing training corpora for 2D/3D pose estimation, dynamic skeleton tracking, and injury risk prediction algorithms.
          </p>
        </div>
      </div>

      {/* Dataset Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {DATASETS.map((ds) => {
          const isSelected = selectedDataset.id === ds.id;
          return (
            <div
              key={ds.id}
              className={`glass-panel ${isSelected ? 'glass-panel-glow' : ''}`}
              onClick={() => setSelectedDataset(ds)}
              style={{
                padding: '20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {ds.category}
                  </span>
                  <Database size={18} color={isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>{ds.name}</h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--accent-emerald)', fontWeight: 600, marginBottom: '10px' }}>
                  {ds.numSamples}
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '14px' }}>
                  {ds.relevance}
                </p>
              </div>

              <div style={{ pt: '10px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>
                  {ds.keypoints}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click for Specs</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Dataset Detail Inspector */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', pb: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{selectedDataset.name} Benchmarking Specifications</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedDataset.category}</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <span className="badge badge-emerald">Verified Training Corpus</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Volume & Annotations</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>{selectedDataset.numSamples}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>{selectedDataset.keypoints}</div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>AI Evaluation Metrics</div>
            {Object.entries(selectedDataset.metrics).map(([key, val]) => (
              <div key={key} style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: '4px' }}>
                {key.toUpperCase()}: {val}
              </div>
            ))}
          </div>
        </div>

        {/* Sample Activity Categories */}
        <div>
          <h4 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '8px' }}>
            Covered Motion & Activity Categories:
          </h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {selectedDataset.sampleTypes.map((type, idx) => (
              <span key={idx} style={{ padding: '6px 12px', background: 'rgba(0, 242, 254, 0.08)', border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: '20px', fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
