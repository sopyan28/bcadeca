'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { colors, fonts } from '@/lib/ui/tokens';

export interface Photo {
  key: string;
  src: string;
  title: string;
  subtitle?: string | null;
  tilt: number;
  width: number;
}

/**
 * Scrapbook wall: tilted Polaroids whose caption is revealed on hover, and which open the
 * full-resolution photo in a lightbox on click. Hover/tilt styling lives in globals.css
 * (.polaroid); the lightbox needs client state, so the whole wall is a client component.
 */
export function PolaroidWall({ photos }: { photos: Photo[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback(
    (delta: number) => setOpenIndex((i) => (i === null ? i : (i + delta + photos.length) % photos.length)),
    [photos.length]
  );

  useEffect(() => {
    if (openIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    }
    window.addEventListener('keydown', onKey);
    // Don't let the page scroll behind the lightbox.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [openIndex, close, step]);

  const open = openIndex === null ? null : photos[openIndex]!;

  return (
    <>
      {/* Left-aligned rather than centred: the "Next Big Thing" lockup sits in the top-right of
          the page background, and a centred wall pushed the last column underneath it. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '34px 22px', padding: '20px 10px 40px', justifyContent: 'flex-start' }}>
        {photos.map((p, i) => (
          <button
            key={p.key}
            className="polaroid"
            onClick={() => setOpenIndex(i)}
            aria-label={`Open ${p.title}`}
            style={{ width: p.width, padding: 0, border: 'none', background: 'none', '--tilt': `${p.tilt}deg` } as CSSProperties}
          >
            <span
              style={{
                display: 'block',
                background: '#fff',
                padding: '10px 10px 34px',
                boxShadow: '0 10px 26px rgba(4,10,40,.45)',
                border: '1px solid #eef3f8',
                position: 'relative',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.title} style={{ width: '100%', height: Math.round(p.width * 0.82), objectFit: 'cover', display: 'block' }} />
              <span
                className="polaroid-cap"
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  right: 10,
                  bottom: 34,
                  background: 'rgba(14,58,99,.62)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 4,
                  textAlign: 'center',
                  padding: 12,
                }}
              >
                <span style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 14.5, color: '#fff' }}>{p.title}</span>
                {p.subtitle && <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.82)' }}>{p.subtitle}</span>}
              </span>
            </span>
          </button>
        ))}
      </div>

      {open && (
        <div
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={open.title}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 400,
            background: 'rgba(6,10,34,.88)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 64px',
            gap: 14,
          }}
        >
          <button
            onClick={close}
            aria-label="Close"
            style={{ position: 'absolute', top: 18, right: 22, border: 'none', background: 'rgba(255,255,255,.12)', color: '#fff', fontSize: 22, lineHeight: 1, width: 40, height: 40, borderRadius: 20, cursor: 'pointer' }}
          >
            ×
          </button>

          {photos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="Previous photo" style={arrowStyle('left')}>
                ‹
              </button>
              <button onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Next photo" style={arrowStyle('right')}>
                ›
              </button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={open.src}
            alt={open.title}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 6, boxShadow: '0 30px 80px rgba(0,0,0,.5)' }}
          />
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 16 }}>{open.title}</div>
            {open.subtitle && <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 3 }}>{open.subtitle}</div>}
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.45)', marginTop: 8 }}>
              {openIndex! + 1} of {photos.length} &nbsp;·&nbsp; Esc to close
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function arrowStyle(side: 'left' | 'right'): CSSProperties {
  return {
    position: 'absolute',
    [side]: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'rgba(255,255,255,.12)',
    color: '#fff',
    fontSize: 30,
    lineHeight: 1,
    width: 44,
    height: 44,
    borderRadius: 22,
    cursor: 'pointer',
  } as CSSProperties;
}
