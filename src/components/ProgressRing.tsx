import React from 'react';

/** Small ring that fills with a topic's progress (0-100). */
export const ProgressRing: React.FC<{ percent: number; size?: number; className?: string }> = ({
  percent,
  size = 22,
  className = '',
}) => {
  const stroke = Math.max(2.5, size / 8);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const done = percent >= 100;
  return (
    <span className={`inline-flex items-center gap-1 shrink-0 ${className}`} title={`${percent}%`} data-testid="progress-ring">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={stroke} />
        {percent > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={done ? '#10b981' : '#3b82f6'}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(c * Math.min(percent, 100)) / 100} ${c}`}
          />
        )}
      </svg>
      <span className={`text-[10px] font-bold ${done ? 'text-emerald-500' : 'text-blue-500'}`}>{percent}%</span>
    </span>
  );
};
