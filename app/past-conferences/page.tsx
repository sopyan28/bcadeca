import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { colors, fonts } from '@/lib/ui/tokens';

const HANDOFF_PHOTOS = [
  { src: '/photos/g1.jpg', title: 'ICDC 2026 in Atlanta' },
  { src: '/photos/g4.jpg', title: 'SCDC 2025' },
  { src: '/photos/g3.jpg', title: 'ICDC 2025 in Orlando' },
  { src: '/photos/g11.jpg', title: 'Conference memories' },
  { src: '/photos/g8.jpg', title: 'DECA Dinner' },
  { src: '/photos/g6.jpg', title: 'DECA Board 2024–25' },
  { src: '/photos/g7.jpg', title: 'Board memories' },
  { src: '/photos/g2.jpg', title: 'ICDC 2026 Top Placers' },
  { src: '/photos/g9.jpg', title: 'Emilly’s Glass' },
  { src: '/photos/g10.jpg', title: 'Mia’s Glass' },
];

export default async function PastConferencesPage() {
  const supabase = await createClient();
  const { data: photos } = await supabase
    .from('gallery_photos')
    .select('id, event_name, location, caption, storage_path')
    .order('sort_order');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bg }}>
      <Header />
      <main style={{ flex: 1, maxWidth: 1100, width: '100%', margin: '0 auto', padding: '30px 22px 60px' }}>
        <h1 style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 28, color: colors.navy, marginBottom: 18 }}>
          Past Conferences
        </h1>
        {photos && photos.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {photos.map((p) => {
              const {
                data: { publicUrl },
              } = supabase.storage.from('gallery').getPublicUrl(p.storage_path);
              return (
                <div key={p.id} style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={publicUrl} alt={p.caption ?? p.event_name} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: colors.navy }}>{p.event_name}</div>
                    {p.location && <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{p.location}</div>}
                    {p.caption && <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 6 }}>{p.caption}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14 }}>
            {HANDOFF_PHOTOS.map((photo, index) => (
              <div key={photo.src} style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, overflow: 'hidden', transform: `rotate(${[-2, 2, -1, 3][index % 4]}deg)` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.src} alt={photo.title} style={{ width: '100%', height: 190, objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: 13, fontFamily: fonts.heading, fontWeight: 700, fontSize: 14.5, color: '#fff', background: 'linear-gradient(135deg,#0e3a63,#1c7fc4)' }}>{photo.title}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
