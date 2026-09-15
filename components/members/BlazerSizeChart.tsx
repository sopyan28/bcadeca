'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { colors, fonts } from '@/lib/ui/tokens';
import { BLAZER_GROUPS, blazerKey } from '@/lib/blazers';

/*
 * Typical body measurements in inches for each size in the closet, so members know what to try
 * on. Brands run an inch or two apart, so these are a starting point rather than a promise.
 *   Women's: Donna Karan's jackets & blazers chart (bust, waist, hips). Tall is for 5'8" and up,
 *            per Nordstrom's size guide.
 *   Men's:   Tailor Size Guide -- the number is the chest, suit pants run 6" smaller at the waist,
 *            and Short / Regular are cut for 5'5"–5'8" / 5'8"–6'1".
 * Rows come from BLAZER_GROUPS, so a size added to the closet shows up here automatically.
 */
const WOMENS_BY_NUMBER: Record<string, { bust: string; waist: string; hips: string }> = {
  '0': { bust: '33½', waist: '26', hips: '36' },
  '2': { bust: '34½', waist: '27', hips: '37' },
  '4': { bust: '35½', waist: '28', hips: '38' },
  '6': { bust: '36½', waist: '29', hips: '39' },
  '8': { bust: '37½', waist: '30', hips: '40' },
  '10': { bust: '38½', waist: '31', hips: '41' },
  '12': { bust: '40', waist: '32½', hips: '42½' },
};

const MENS_HEIGHT_BY_LENGTH: Record<string, string> = {
  S: `5'5"–5'8"`,
  R: `5'8"–6'1"`,
};

const [WOMENS, MENS] = BLAZER_GROUPS;

const cell = { padding: '8px 10px', fontSize: 13, color: colors.navy, textAlign: 'left' as const, whiteSpace: 'nowrap' as const };
const headCell = { ...cell, fontSize: 10.5, fontWeight: 800, color: colors.textFaint, textTransform: 'uppercase' as const, letterSpacing: 0.4 };

function Stock({ count }: { count: number }) {
  return <span style={{ fontWeight: 800, color: count > 0 ? colors.green : colors.redDark }}>{count > 0 ? count : 'Out'}</span>;
}

export function BlazerSizeChart({ counts }: { counts: Record<string, number> }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ border: `1.5px solid ${colors.borderLight}`, background: '#fff', color: '#1c7fc4', fontFamily: fonts.body, fontWeight: 800, fontSize: 12, borderRadius: 16, padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        📏 Size chart
      </button>

      {/* Portaled to <body> so no sticky or stacked ancestor can paint over it. */}
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Blazer size chart"
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(14,58,99,.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 620, maxHeight: '86vh', overflowY: 'auto', padding: 24, boxShadow: '0 30px 70px rgba(10,40,80,.35)', animation: 'pop .25s ease' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 18, color: colors.navy }}>👔 Blazer size chart</div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close size chart"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, color: colors.textMuted }}
                >
                  ✕
                </button>
              </div>
              <p style={{ fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.5, margin: '6px 0 16px' }}>
                Typical body measurements in inches. Brands vary by an inch or two, so use these to pick what to try on.
              </p>

              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textFaint, marginBottom: 6 }}>{WOMENS.label}</div>
              <div style={{ overflowX: 'auto', border: `1.5px solid ${colors.borderFaint}`, borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: colors.bg }}>
                      <th style={headCell}>Size</th>
                      <th style={headCell}>Bust</th>
                      <th style={headCell}>Waist</th>
                      <th style={headCell}>Hips</th>
                      <th style={headCell}>In closet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {WOMENS.sizes.map((size) => {
                      const m = WOMENS_BY_NUMBER[size.replace(/[A-Z]+$/, '')];
                      return (
                        <tr key={size} style={{ borderTop: `1px solid ${colors.borderFaint}` }}>
                          <td style={{ ...cell, fontWeight: 800 }}>{size}</td>
                          <td style={cell}>{m?.bust ?? '—'}</td>
                          <td style={cell}>{m?.waist ?? '—'}</td>
                          <td style={cell}>{m?.hips ?? '—'}</td>
                          <td style={cell}><Stock count={counts[blazerKey(WOMENS.key, size)] ?? 0} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 11.5, color: colors.textMuted, margin: '6px 0 18px' }}>
                R = regular length · T = tall, for about 5&apos;8&quot; and up
              </div>

              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textFaint, marginBottom: 6 }}>{MENS.label}</div>
              <div style={{ overflowX: 'auto', border: `1.5px solid ${colors.borderFaint}`, borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: colors.bg }}>
                      <th style={headCell}>Size</th>
                      <th style={headCell}>Chest</th>
                      <th style={headCell}>Pants waist</th>
                      <th style={headCell}>Height</th>
                      <th style={headCell}>In closet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MENS.sizes.map((size) => {
                      const chest = Number.parseInt(size, 10);
                      return (
                        <tr key={size} style={{ borderTop: `1px solid ${colors.borderFaint}` }}>
                          <td style={{ ...cell, fontWeight: 800 }}>{size}</td>
                          <td style={cell}>{chest}</td>
                          <td style={cell}>{chest - 6}</td>
                          <td style={cell}>{MENS_HEIGHT_BY_LENGTH[size.replace(/^\d+/, '')] ?? '—'}</td>
                          <td style={cell}><Stock count={counts[blazerKey(MENS.key, size)] ?? 0} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 6 }}>
                The number is the chest size · S = short length · R = regular length
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
