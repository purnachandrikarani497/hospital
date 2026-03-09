import React from "react";

export default function Logo({ size = 24, src }) {
  const s = Number(size) || 18;
  const def = "/uploads/image.png";
  const altA = "/uploads/Screenshot 2025-12-03 162736.png";
  const altB = "/uploads/Screenshot 2025-12-03 145101.png";
  const u = String(src || def);
  return (
    <div style={{ width: s, height: s }} className="relative inline-block">
      <img
        src={u}
        alt="Logo"
        width={s}
        height={s}
        className="object-contain select-none pointer-events-none absolute inset-0"
        onError={(e) => {
          const cur = e.currentTarget.src || "";
          if (!cur.endsWith("image.png")) { e.currentTarget.src = def; return; }
          if (!cur.endsWith("162736.png")) { e.currentTarget.src = altA; return; }
          if (!cur.endsWith("145101.png")) { e.currentTarget.src = altB; return; }
          e.currentTarget.style.display = "none";
        }}
      />
      <svg width={s} height={s} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="g0" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#34E7FF" />
            <stop offset="60%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#0A5FD1" />
          </radialGradient>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#B9FFFF" />
            <stop offset="100%" stopColor="#2CF0FF" />
          </linearGradient>
          <filter id="f" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="hl" cx="50%" cy="35%" r="30%">
            <stop offset="0%" stopColor="#E8FFFF" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect x="8" y="8" width="48" height="48" rx="12" fill="url(#g0)" />
        <circle cx="32" cy="24" r="10" fill="url(#hl)" />
        <g filter="url(#f)">
          <path d="M18 28 C20 18, 44 18, 46 28" fill="none" stroke="url(#g1)" strokeWidth="6" strokeLinecap="round" />
          <rect x="28" y="20" width="8" height="24" rx="4" fill="url(#g1)" />
          <rect x="20" y="28" width="24" height="8" rx="4" fill="url(#g1)" />
          <rect x="13" y="26" width="10" height="10" rx="3" fill="url(#g1)" />
          <rect x="41" y="26" width="10" height="10" rx="3" fill="url(#g1)" />
          <path d="M49 38 L58 44" stroke="url(#g1)" strokeWidth="4" strokeLinecap="round" />
          <circle cx="59" cy="45" r="3" fill="url(#g1)" />
        </g>
      </svg>
    </div>
  );
}
