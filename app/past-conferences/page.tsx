import type { CSSProperties } from 'react';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { colors, fonts } from '@/lib/ui/tokens';

/**
 * Scrapbook wall from the design prototype's pastNode(): each photo is a tilted Polaroid
 * whose caption sits hidden over the image and is revealed on hover, while the photo
 * straightens and lifts. Tilt/width come from the design's per-photo values so the wall
 * keeps its hand-pinned rhythm rather than reading as a uniform grid.
 * Hover/reveal styling lives in app/globals.css (.polaroid).
 */
const HANDOFF_PHOTOS: { src: string; title: string; tilt: number; width: number }[] = [
  { src: '/photos/g1.jpg', title: 'ICDC 2026 in Atlanta', tilt: -3, width: 230 },
  { src: '/photos/g4.jpg', title: 'SCDC 2025', tilt: 2, width: 205 },
  { src: '/photos/g3.jpg', title: 'ICDC 2025 in Orlando', tilt: -2, width: 190 },
  { src: '/photos/g11.jpg', title: 'Another one!', tilt: 3, width: 215 },
  { src: '/photos/g8.jpg', title: 'DECA Dinner', tilt: -1, width: 180 },
  { src: '/photos/g6.jpg', title: 'DECA Board 24-25', tilt: 2, width: 240 },
  { src: '/photos/g7.jpg', title: 'Another 24-25 Board pic!', tilt: -3, width: 200 },
  { src: '/photos/g2.jpg', title: 'ICDC 2026 Top Placers', tilt: 1, width: 225 },
  { src: '/photos/g9.jpg', title: "Emily's Glass!", tilt: -2, width: 175 },
  { src: '/photos/g10.jpg', title: "Mia's Glass!", tilt: 3, width: 175 },
];

// Uploaded photos have no per-photo tilt/width, so cycle the design's values to keep the
// same scrapbook irregularity as the gallery grows.
const TILT_CYCLE = [-3, 2, -2, 3, -1, 2, -3, 1, -2, 3];
const WIDTH_CYCLE = [230, 205, 190, 215, 180, 240, 200, 225, 175, 175];

function Polaroid({ src, title, subtitle, tilt, width }: { src: string; title: string; subtitle?: string | null; tilt: number; width: number }) {
  return (
    <figure className="polaroid" tabIndex={0} style={{ width, margin: 0, '--tilt': `${tilt}deg` } as CSSProperties}>
      <div
        style={{
          background: '#fff',
          padding: '10px 10px 34px',
          boxShadow: '0 10px 22px rgba(20,60,110,.18)',
          border: '1px solid #eef3f8',
          position: 'relative',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={title} style={{ width: '100%', height: Math.round(width * 0.82), objectFit: 'cover', display: 'block' }} />
        <figcaption
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
          <span style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 14.5, color: '#fff' }}>{title}</span>
          {subtitle && <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.82)' }}>{subtitle}</span>}
        </figcaption>
      </div>
    </figure>
  );
}

export default async function PastConferencesPage() {
  const supabase = await createClient();
  const { data: photos } = await supabase
    .from('gallery_photos')
    .select('id, event_name, location, caption, storage_path')
    .order('sort_order');

  const wall = { display: 'flex', flexWrap: 'wrap' as const, gap: '34px 22px', padding: '20px 10px 40px', justifyContent: 'center' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bg }}>
      <Header />
      <main style={{ flex: 1, maxWidth: 1100, width: '100%', margin: '0 auto', padding: '30px 22px 60px' }}>
        <h1 style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 24, color: colors.navy, marginBottom: 24 }}>Past Conferences</h1>
        {photos && photos.length > 0 ? (
          <div style={wall}>
            {photos.map((p, i) => {
              const {
                data: { publicUrl },
              } = supabase.storage.from('gallery').getPublicUrl(p.storage_path);
              return (
                <Polaroid
                  key={p.id}
                  src={publicUrl}
                  title={p.caption || p.event_name}
                  subtitle={p.location}
                  tilt={TILT_CYCLE[i % TILT_CYCLE.length]!}
                  width={WIDTH_CYCLE[i % WIDTH_CYCLE.length]!}
                />
              );
            })}
          </div>
        ) : (
          <div style={wall}>
            {HANDOFF_PHOTOS.map((p) => (
              <Polaroid key={p.src} src={p.src} title={p.title} tilt={p.tilt} width={p.width} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
