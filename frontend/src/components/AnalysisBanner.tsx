"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const LS_ANALYZING_KEY = "sg_analysis_in_progress";

export default function AnalysisBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [analyzing, setAnalyzing] = useState<{ filename: string } | null>(null);

  useEffect(() => {
    const check = () => {
      try {
        const raw = localStorage.getItem(LS_ANALYZING_KEY);
        setAnalyzing(raw ? JSON.parse(raw) : null);
      } catch {
        setAnalyzing(null);
      }
    };

    check();
    // Poll every 2 seconds so the banner disappears as soon as localStorage is cleared
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, [pathname]);

  if (!analyzing) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "linear-gradient(90deg, #7c3aed, #2563eb)",
        color: "#fff",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "13px",
        fontWeight: 600,
        boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Spinning loader */}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
        >
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        <span>
          Analysing <span style={{ fontWeight: 800 }}>
            {analyzing.filename.length > 30
              ? analyzing.filename.substring(0, 30) + "..."
              : analyzing.filename}
          </span> — you can browse freely, your results will be ready soon.
        </span>
      </div>
      <button
        onClick={() => router.push("/dashboard/analyze")}
        style={{
          background: "rgba(255,255,255,0.2)",
          border: "none",
          color: "#fff",
          padding: "5px 14px",
          borderRadius: "20px",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        View Results →
      </button>
    </div>
  );
}

// CSS keyframe injected globally so no extra CSS file is needed
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  if (!document.getElementById("sg-spin")) {
    style.id = "sg-spin";
    document.head.appendChild(style);
  }
}
