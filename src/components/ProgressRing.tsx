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
  // Colour by stage: lesson red, basic test yellow, middle test blue, done green
  const [color, text] =
    percent >= 100
      ? ['#10b981', 'text-emerald-500']
      : percent > 55
      ? ['#3b82f6', 'text-blue-500']
      : percent > 35
      ? ['#f59e0b', 'text-amber-500']
      : ['#ef4444', 'text-red-500'];
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
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(c * Math.min(percent, 100)) / 100} ${c}`}
          />
        )}
      </svg>
      <span className={`text-[10px] font-bold ${text}`}>{percent}%</span>
    </span>
  );
};
