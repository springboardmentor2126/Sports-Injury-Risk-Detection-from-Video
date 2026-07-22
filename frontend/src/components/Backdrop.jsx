import React from "react";

/**
 * Fixed full-bleed background layer, swapped by route. Everything here is
 * CSS/SVG-generated (gradients, dot-grids, rings) — no external images —
 * so it stays fast, has no licensing risk, and can be recolored from the
 * same design tokens as the rest of the UI.
 */
export default function Backdrop({ variant }) {
  return (
    <div className={`backdrop backdrop-${variant}`} aria-hidden="true">
      {variant === "home" && (
        <>
          <div className="blob blob-a" />
          <div className="blob blob-b" />
          <div className="backdrop-grid" />
          <svg className="backdrop-waveform-strip" viewBox="0 0 1200 80" preserveAspectRatio="none">
            <path
              d="M0 60 C 60 55, 90 20, 130 30 C 170 40, 190 70, 230 65 C 270 60, 290 15, 330 12
                 C 370 9, 390 60, 430 62 C 470 64, 490 20, 530 18 C 570 16, 590 55, 630 58
                 C 670 61, 690 25, 730 22 C 770 19, 790 58, 830 60 C 870 62, 890 22, 930 20
                 C 970 18, 990 56, 1030 58 C 1070 60, 1090 24, 1130 22 C 1160 21, 1180 50, 1200 48"
              fill="none" stroke="currentColor" strokeWidth="1.5"
            />
          </svg>
        </>
      )}

      {(variant === "login" || variant === "register") && (
        <>
          <div className="backdrop-grid" />
          <svg className="backdrop-rings" viewBox="0 0 520 520">
            <circle cx="260" cy="260" r="60" />
            <circle cx="260" cy="260" r="120" />
            <circle cx="260" cy="260" r="180" />
            <circle cx="260" cy="260" r="240" />
          </svg>
          {variant === "register" && (
            <svg className="backdrop-skeleton" viewBox="0 0 300 400">
              <g>
                <circle cx="150" cy="60" r="16" className="sk-node" style={{ animationDelay: "0s" }} />
                <line x1="150" y1="76" x2="150" y2="160" className="sk-bone" style={{ animationDelay: "0.15s" }} />
                <line x1="150" y1="100" x2="100" y2="140" className="sk-bone" style={{ animationDelay: "0.3s" }} />
                <circle cx="100" cy="140" r="9" className="sk-node" style={{ animationDelay: "0.35s" }} />
                <line x1="150" y1="100" x2="200" y2="140" className="sk-bone" style={{ animationDelay: "0.3s" }} />
                <circle cx="200" cy="140" r="9" className="sk-node" style={{ animationDelay: "0.35s" }} />
                <line x1="150" y1="160" x2="115" y2="240" className="sk-bone" style={{ animationDelay: "0.5s" }} />
                <line x1="115" y1="240" x2="130" y2="320" className="sk-bone" style={{ animationDelay: "0.65s" }} />
                <circle cx="115" cy="240" r="9" className="sk-node" style={{ animationDelay: "0.55s" }} />
                <circle cx="130" cy="320" r="9" className="sk-node" style={{ animationDelay: "0.7s" }} />
                <line x1="150" y1="160" x2="185" y2="240" className="sk-bone" style={{ animationDelay: "0.5s" }} />
                <line x1="185" y1="240" x2="175" y2="320" className="sk-bone" style={{ animationDelay: "0.65s" }} />
                <circle cx="185" cy="240" r="9" className="sk-node" style={{ animationDelay: "0.55s" }} />
                <circle cx="175" cy="320" r="9" className="sk-node" style={{ animationDelay: "0.7s" }} />
              </g>
            </svg>
          )}
        </>
      )}

      {variant === "athletes" && (
        <>
          <div className="backdrop-grid backdrop-grid-quiet" />
          <div className="backdrop-lanes" />
        </>
      )}

      {variant === "videos" && (
        <>
          <div className="backdrop-grid backdrop-grid-quiet" />
          <div className="backdrop-scanline" />
          <div className="backdrop-frames">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="backdrop-frame" style={{ animationDelay: `${i * 1.1}s` }} />
            ))}
          </div>
        </>
      )}

      {variant === "upload" && (
        <>
          <div className="backdrop-grid backdrop-grid-quiet" />
          <div className="backdrop-particles">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="backdrop-particle"
                style={{
                  left: `${(i * 7.3) % 100}%`,
                  animationDelay: `${(i * 0.6) % 8}s`,
                  animationDuration: `${7 + (i % 5)}s`,
                }}
              />
            ))}
          </div>
        </>
      )}

      {variant === "app" && <div className="backdrop-grid backdrop-grid-quiet" />}
    </div>
  );
}
