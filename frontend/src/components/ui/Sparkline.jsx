/** Tiny SVG sparkline — no chart library needed on account cards. */
export default function Sparkline({
  data = [],
  width = 120,
  height = 36,
  color = '#0d9488',
  className = '',
}) {
  const values = (data || []).map(Number).filter((n) => Number.isFinite(n));
  if (values.length < 2) {
    return (
      <svg width={width} height={height} className={className} aria-hidden>
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={color} strokeOpacity="0.25" strokeWidth="1.5" />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const innerH = height - pad * 2;
  const step = width / (values.length - 1);

  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = pad + innerH - ((v - min) / span) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const last = values[values.length - 1];
  const first = values[0];
  const up = last >= first;
  const stroke = color || (up ? '#22c55e' : '#ef4444');

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        opacity="0.9"
      />
    </svg>
  );
}
