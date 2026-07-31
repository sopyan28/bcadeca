import { colors, fonts } from '@/lib/ui/tokens';

export interface RadarDatum {
  kpi_area: string;
  mastery_pct: number;
  confidence_pct: number;
  low_data: boolean;
}

const SIZE = 340;
const CENTER = SIZE / 2;
const MAX_R = 118;
const RINGS = [25, 50, 75, 100];

function pointFor(index: number, total: number, valuePct: number) {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / total;
  const r = (Math.max(0, Math.min(100, valuePct)) / 100) * MAX_R;
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
}

function labelPointFor(index: number, total: number) {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / total;
  const r = MAX_R + 26;
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
}

function polygonPoints(data: RadarDatum[], key: 'mastery_pct' | 'confidence_pct') {
  return data.map((d, i) => pointFor(i, data.length, d[key])).map((p) => `${p.x},${p.y}`).join(' ');
}

export function RadarChart({ data }: { data: RadarDatum[] }) {
  if (data.length < 3) {
    return (
      <div style={{ fontSize: 13, color: colors.textMuted, padding: 20 }}>
        Radar chart needs at least 3 KPI areas with results -- keep practicing to unlock it.
      </div>
    );
  }

  const n = data.length;

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {RINGS.map((ring) => (
        <polygon
          key={ring}
          points={Array.from({ length: n }, (_, i) => {
            const p = pointFor(i, n, ring);
            return `${p.x},${p.y}`;
          }).join(' ')}
          fill="none"
          stroke={colors.borderFaint}
          strokeWidth={1}
        />
      ))}

      {data.map((_, i) => {
        const p = pointFor(i, n, 100);
        return <line key={i} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke={colors.borderFaint} strokeWidth={1} />;
      })}

      <polygon points={polygonPoints(data, 'confidence_pct')} fill="none" stroke={colors.purple} strokeWidth={2} strokeDasharray="4 3" />
      <polygon points={polygonPoints(data, 'mastery_pct')} fill={`${colors.blue}33`} stroke={colors.blue} strokeWidth={2} />

      {data.map((d, i) => {
        const p = pointFor(i, n, d.mastery_pct);
        return <circle key={d.kpi_area} cx={p.x} cy={p.y} r={3.5} fill={colors.blue} />;
      })}

      {data.map((d, i) => {
        const p = labelPointFor(i, n);
        return (
          <text
            key={d.kpi_area}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily={fonts.body}
            fontSize={10.5}
            fontWeight={800}
            fill={d.low_data ? colors.goldText : colors.textSecondary}
          >
            {d.kpi_area}
          </text>
        );
      })}
    </svg>
  );
}
