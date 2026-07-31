import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { colors, fonts } from '@/lib/ui/tokens';

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
          <div style={{ color: colors.textMuted, fontSize: 14 }}>No photos uploaded yet.</div>
        )}
      </main>
    </div>
  );
}
