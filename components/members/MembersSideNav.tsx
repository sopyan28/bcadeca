'use client';

import { useEffect, useState } from 'react';
import { colors, fonts } from '@/lib/ui/tokens';

/**
 * The members sub-nav from the design prototype: jumps to a section and highlights whichever
 * one is currently in view. Plain anchors, so it still navigates with JavaScript disabled --
 * the observer only drives the highlight.
 */
const LINKS = [
  { id: 'sec-announce', label: 'Announcements', icon: '📣' },
  { id: 'sec-resources', label: 'Resources', icon: '📚' },
  { id: 'sec-season', label: 'Season 26-27', icon: '📅' },
];

export function MembersSideNav() {
  const [active, setActive] = useState(LINKS[0]!.id);

  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      // Bias the band toward the top of the viewport so the highlight matches what you're reading.
      { rootMargin: '-88px 0px -55% 0px', threshold: 0 }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Members sections"
      style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 9, padding: 10, display: 'flex', flexDirection: 'column', gap: 3 }}
    >
      <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 12.5, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: '.6px', padding: '4px 12px 6px' }}>
        Members
      </div>
      {LINKS.map((l) => {
        const on = active === l.id;
        return (
          <a
            key={l.id}
            href={`#${l.id}`}
            aria-current={on ? 'true' : undefined}
            style={{
              textAlign: 'left',
              fontFamily: fonts.body,
              fontWeight: 800,
              fontSize: 14,
              padding: '11px 12px',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
              background: on ? '#e9f6ff' : 'transparent',
              color: on ? colors.navy : colors.textSecondary,
            }}
          >
            <span style={{ fontSize: 15 }}>{l.icon}</span>
            {l.label}
          </a>
        );
      })}
    </nav>
  );
}
