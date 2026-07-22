import React from "react";

/**
 * Signature hero element: an animated biomechanical waveform trace,
 * like a joint-angle / EMG readout, drawing itself in once on load.
 * Grounded in the actual product (pose estimation produces exactly this
 * kind of time-series signal) rather than generic decorative motion.
 */
export function WaveformTrace({ className = "" }) {
  return (
    <svg viewBox="0 0 640 160" className={`waveform-trace ${className}`} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <line x1="0" y1="80" x2="640" y2="80" stroke="var(--line-faint)" strokeWidth="1" strokeDasharray="2 6" />
      <path
        className="waveform-path waveform-path-ghost"
        d="M0 90 C 40 88, 60 60, 90 65 C 120 70, 130 110, 160 112 C 190 114, 210 55, 240 50
           C 270 45, 290 100, 320 105 C 350 110, 370 45, 400 40 C 430 35, 450 95, 480 100
           C 510 105, 530 60, 560 58 C 590 56, 610 85, 640 82"
        fill="none" stroke="var(--accent-soft)" strokeWidth="2"
      />
      <path
        className="waveform-path"
        d="M0 100 C 40 96, 60 40, 90 48 C 120 56, 130 120, 160 124 C 190 128, 210 35, 240 30
           C 270 25, 290 112, 320 118 C 350 124, 370 30, 400 26 C 430 22, 450 105, 480 112
           C 510 118, 530 42, 560 40 C 590 38, 610 90, 640 86"
        fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"
      />
      <circle cx="240" cy="30" r="4" className="waveform-marker" style={{ animationDelay: "0.9s" }} />
      <circle cx="400" cy="26" r="4" className="waveform-marker" style={{ animationDelay: "1.35s" }} />
      <circle cx="560" cy="40" r="4" className="waveform-marker" style={{ animationDelay: "1.7s" }} />
    </svg>
  );
}

/** Runner rendered as pose keypoints + bones — the hero's secondary anchor visual. */
export function HeroIllustration({ className = "" }) {
  return (
    <svg viewBox="0 0 320 320" className={`illustration ${className}`} xmlns="http://www.w3.org/2000/svg">
      <circle cx="160" cy="160" r="130" fill="var(--accent)" opacity="0.06" />
      <g className="hero-runner">
        <line x1="150" y1="120" x2="135" y2="175" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="158" cy="100" r="14" fill="var(--accent)" />
        <line x1="142" y1="130" x2="115" y2="115" stroke="var(--accent-signal)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="115" cy="115" r="5" fill="var(--accent-signal)" />
        <line x1="142" y1="130" x2="170" y2="160" stroke="var(--accent-signal)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="170" cy="160" r="5" fill="var(--accent-signal)" />
        <line x1="135" y1="175" x2="110" y2="200" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
        <line x1="110" y1="200" x2="125" y2="230" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="110" cy="200" r="5" fill="var(--accent)" />
        <circle cx="125" cy="230" r="5" fill="var(--accent)" />
        <line x1="135" y1="175" x2="170" y2="190" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
        <line x1="170" y1="190" x2="165" y2="230" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="170" cy="190" r="5" fill="var(--accent)" />
        <circle cx="165" cy="230" r="5" fill="var(--accent)" />
        <circle cx="135" cy="175" r="5" fill="var(--accent)" />
      </g>
    </svg>
  );
}

/** Cloud-with-arrow upload motif. */
export function UploadIllustration({ className = "" }) {
  return (
    <svg viewBox="0 0 200 160" className={`illustration ${className}`} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="100" cy="120" rx="70" ry="12" fill="var(--accent)" opacity="0.08" />
      <path d="M60 95 a28 28 0 0 1 -6 -55 a35 35 0 0 1 68 -10 a24 24 0 0 1 -4 65 z"
            fill="var(--surface-alt)" stroke="var(--accent)" strokeWidth="2.5" />
      <line x1="100" y1="55" x2="100" y2="95" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" />
      <path d="M84 71 L100 55 L116 71" stroke="var(--accent)" strokeWidth="4" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Simple empty-state clipboard illustration. */
export function EmptyIllustration({ className = "" }) {
  return (
    <svg viewBox="0 0 160 160" className={`illustration ${className}`} xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="24" width="80" height="112" rx="10" fill="var(--surface-alt)" stroke="var(--accent)" strokeWidth="2" />
      <rect x="60" y="16" width="40" height="16" rx="6" fill="var(--accent)" />
      <line x1="56" y1="60" x2="104" y2="60" stroke="var(--line-faint)" strokeWidth="5" strokeLinecap="round" />
      <line x1="56" y1="78" x2="104" y2="78" stroke="var(--line-faint)" strokeWidth="5" strokeLinecap="round" />
      <line x1="56" y1="96" x2="86" y2="96" stroke="var(--line-faint)" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
