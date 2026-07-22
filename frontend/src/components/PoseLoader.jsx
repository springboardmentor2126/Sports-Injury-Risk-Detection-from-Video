import React from "react";

export default function PoseLoader({ text = "Processing..." }) {
  return (
    <div className="pose-loader">
      <svg viewBox="0 0 100 100" className="pose-loader-svg">
        <g>
          <circle cx="50" cy="20" r="6" className="pl-dot pl-d1" />
          <line x1="50" y1="26" x2="50" y2="55" className="pl-bone pl-b1" />
          <line x1="50" y1="35" x2="30" y2="45" className="pl-bone pl-b2" />
          <line x1="50" y1="35" x2="70" y2="45" className="pl-bone pl-b3" />
          <circle cx="30" cy="45" r="4" className="pl-dot pl-d2" />
          <circle cx="70" cy="45" r="4" className="pl-dot pl-d3" />
          <line x1="50" y1="55" x2="35" y2="80" className="pl-bone pl-b4" />
          <line x1="50" y1="55" x2="65" y2="80" className="pl-bone pl-b5" />
          <circle cx="35" cy="80" r="4" className="pl-dot pl-d4" />
          <circle cx="65" cy="80" r="4" className="pl-dot pl-d5" />
        </g>
      </svg>
      <p className="pose-loader-text">{text}</p>
    </div>
  );
}
