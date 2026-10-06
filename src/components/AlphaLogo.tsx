import React from 'react';

/** The site's logo: a hand-drawn α on an amber rounded square. */
export const AlphaLogo: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 100 100" className={`shrink-0 ${className}`} aria-hidden="true">
    <rect width="100" height="100" rx="24" fill="#f59e0b" />
    <path
      d="M78 30 C70 52 62 70 48 74 C34 78 22 68 22 52 C22 36 34 26 46 26 C60 26 66 40 72 56 C76 66 80 74 88 76"
      fill="none"
      stroke="#1c1917"
      strokeWidth="9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
