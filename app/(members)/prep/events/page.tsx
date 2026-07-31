import { colors, fonts } from '@/lib/ui/tokens';

const EVENTS = [
  {
    event: 'Principles of Marketing',
    cluster: 'Marketing',
    links: ['Cluster exam prep guide', '100 PIs flashcard set', 'Sample role-play scenarios'],
  },
  {
    event: 'Principles of Finance',
    cluster: 'Finance',
    links: ['Finance PI checklist', 'Ratio cheat sheet', 'Past written events'],
  },
  {
    event: 'Entrepreneurship (ENT)',
    cluster: 'Entrepreneurship',
    links: ['Business plan rubric', 'Pitch deck template', 'Judge Q&A bank'],
  },
  {
    event: 'Hospitality & Tourism',
    cluster: 'Hospitality',
    links: ['Service scenario pack', 'Cluster exam prep', 'Industry trends brief'],
  },
  {
    event: 'Business Management & Admin',
    cluster: 'Management',
    links: ['Operations PI guide', 'Org behavior notes', 'Case study library'],
  },
] as const;

export default function EventsPage() {
  return (
    <div style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 24 }}>
      <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 21, color: colors.navy, marginBottom: 3 }}>
        Resources by Event
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, marginBottom: 18 }}>
        Study materials sorted by competitive event
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {EVENTS.map((ev) => (
          <div key={ev.event} style={{ border: `2px solid ${colors.borderFaint}`, borderRadius: 7, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '.4px',
                  color: '#1c7fc4',
                  background: '#e9f6ff',
                  borderRadius: 3,
                  padding: '3px 8px',
                }}
              >
                {ev.cluster}
              </span>
              <span style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 16, color: colors.navy }}>{ev.event}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ev.links.map((l) => (
                <span
                  key={l}
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#1c6aa8',
                    background: '#f4f9fd',
                    border: `1.5px solid ${colors.borderFaint}`,
                    borderRadius: 5,
                    padding: '7px 12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  📄 {l}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
