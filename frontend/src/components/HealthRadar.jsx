import React from 'react';

// Pentagon radar chart for code health.
export default function HealthRadar({ metrics }) {
  if (!metrics) return null;
  const size = 220;
  const cx = size / 2, cy = size / 2;
  const radius = 75;
  const n = metrics.axes.length;

  const points = metrics.axes.map((axis, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (axis.value / 100) * radius;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, ...axis, angle };
  });
  const labelPoints = metrics.axes.map((axis, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * (radius + 22),
      y: cy + Math.sin(angle) * (radius + 22),
      label: axis.label,
      value: axis.value,
    };
  });
  const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ');

  const grade = metrics.grade;
  const gradeColor = metrics.overall >= 70 ? '#34d399' : metrics.overall >= 50 ? '#fbbf24' : '#f87171';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <defs>
        <radialGradient id="radarGrad">
          <stop offset="0%" stopColor={gradeColor} stopOpacity="0.45" />
          <stop offset="100%" stopColor={gradeColor} stopOpacity="0.08" />
        </radialGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(scale => (
        <polygon
          key={scale}
          points={metrics.axes.map((_, i) => {
            const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
            return `${cx + Math.cos(angle) * radius * scale},${cy + Math.sin(angle) * radius * scale}`;
          }).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}
      {metrics.axes.map((_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={cx + Math.cos(angle) * radius}
            y2={cy + Math.sin(angle) * radius}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        );
      })}
      <polygon
        points={polygonPath}
        fill="url(#radarGrad)"
        stroke={gradeColor}
        strokeWidth="1.5"
        style={{ filter: `drop-shadow(0 0 8px ${gradeColor}66)`, transition: 'all 0.4s ease' }}
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={gradeColor} />
      ))}
      {labelPoints.map((p, i) => (
        <g key={i}>
          <text
            x={p.x} y={p.y}
            fill="rgba(255,255,255,0.7)"
            fontSize="9.5"
            fontFamily="JetBrains Mono"
            textAnchor="middle"
            dominantBaseline="middle"
          >{p.label}</text>
          <text
            x={p.x} y={p.y + 11}
            fill={gradeColor}
            fontSize="10"
            fontFamily="JetBrains Mono"
            fontWeight="600"
            textAnchor="middle"
          >{p.value}</text>
        </g>
      ))}
      <circle cx={cx} cy={cy} r="22" fill="rgba(0,0,0,0.6)" stroke={gradeColor} strokeWidth="1.5" />
      <text x={cx} y={cy + 1} fill={gradeColor} fontSize="22" fontWeight="700" fontFamily="Space Grotesk" textAnchor="middle" dominantBaseline="middle">{grade}</text>
    </svg>
  );
}
