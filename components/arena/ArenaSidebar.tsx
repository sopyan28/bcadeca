'use client';

import { useState, type ReactNode } from 'react';
import { colors, fonts } from '@/lib/ui/tokens';

type SideTab = 'practice' | 'missed' | 'shop';

/**
 * The arena's 300px sticky sidebar from the design prototype's sidebar(): a segmented
 * Practice / Missed / Shop switcher over a scrolling panel, sitting beside the ocean
 * leaderboard rather than stacking practice and shop down the page.
 */
export function ArenaSidebar({
  practice,
  missed,
  shop,
  missedCount,
}: {
  practice: ReactNode;
  missed: ReactNode;
  shop: ReactNode;
  missedCount: number;
}) {
  const [tab, setTab] = useState<SideTab>('practice');

  const tabs: { id: SideTab; label: string }[] = [
    { id: 'practice', label: 'Practice' },
    { id: 'missed', label: `Missed (${missedCount})` },
    { id: 'shop', label: 'Shop' },
  ];

  return (
    <div style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 9, padding: 12, position: 'sticky', top: 78 }}>
      <div style={{ display: 'flex', gap: 4, background: '#f0f6fb', borderRadius: 6, padding: 4, marginBottom: 12 }}>
        {tabs.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                border: 'none',
                cursor: 'pointer',
                fontFamily: fonts.body,
                fontWeight: 800,
                fontSize: 12.5,
                padding: '8px 4px',
                borderRadius: 5,
                background: on ? colors.navy : 'transparent',
                color: on ? '#fff' : colors.textSecondary,
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div style={{ maxHeight: 430, overflowY: 'auto', paddingRight: 2 }}>
        {tab === 'practice' && practice}
        {tab === 'missed' && missed}
        {tab === 'shop' && shop}
      </div>
    </div>
  );
}
