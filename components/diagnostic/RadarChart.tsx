import { colors, fonts } from '@/lib/ui/tokens';

export interface RadarDatum {
  kpi_area: string;
  mastery_pct: number;
  confidence_pct: number;
  low_data: boolean;
}

// Sized so the longest abbreviated label ("Marketing-Info Mgmt", ~105px at 9.5px bold)
// still clears the edge when anchored at MAX_R + 12. The svg scales down responsively.
const SIZE = 520;
const CENTER = SIZE / 2;
const MAX_R = 118;
const RINGS = [25, 50, 75, 100];

/**
 * The bank spans 25 instructional areas, several with names too long to sit flat around a
 * 25-spoke radar without colliding. Labels are abbreviated and rotated to run along their
 * own spoke; the exact per-area scores live in the list underneath the chart.
 */
const LABEL_ABBREVIATIONS: [RegExp, string][] = [
  [/\bInformation\b/g, 'Info'],
  [/\bManagement\b/g, 'Mgmt'],
  [/\bProfessional\b/g, 'Prof.'],
  [/\bDevelopment\b/g, 'Dev.'],
  [/\bIntelligence\b/g, 'Intel.'],
  [/\bCommunication\b/g, 'Comms'],
  [/\bHuman Resources\b/g, 'HR'],
  [/\bProduct\/Service\b/g, 'Product / Svc'],
  [/\bEntrepreneurship\b/g, 'Entrep.'],
  [/\bRelations\b/g, 'Rel.'],
];

function shortLabel(area: string): string {
  return LABEL_ABBREVIATIONS.reduce((s, [re, to]) => s.replace(re, to), area);
}

function pointFor(index: number, total: number, valuePct: number) {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / total;
  const r = (Math.max(0, Math.min(100, valuePct)) / 100) * MAX_R;
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
}

function labelPointFor(index: number, total: number) {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / total;
  const r = MAX_R + 12;
  const deg = (angle * 180) / Math.PI;
  // Flip labels on the left half so they read left-to-right instead of upside down.
  const flipped = Math.cos(angle) < 0;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
    rotation: flipped ? deg + 180 : deg,
    anchor: flipped ? ('end' as const) : ('start' as const),
  };
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
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ maxWidth: '100%', height: 'auto' }}>
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
            transform={`rotate(${p.rotation} ${p.x} ${p.y})`}
            textAnchor={p.anchor}
            dominantBaseline="middle"
            fontFamily={fonts.body}
            fontSize={9.5}
            fontWeight={800}
            fill={d.low_data ? colors.goldText : colors.textSecondary}
          >
            {shortLabel(d.kpi_area)}
          </text>
        );
      })}
    </svg>
  );
}
