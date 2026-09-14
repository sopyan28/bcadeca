import { createClient } from '@/lib/supabase/server';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { PolaroidWall, type Photo } from '@/components/gallery/PolaroidWall';
import { fonts } from '@/lib/ui/tokens';

/** Per-photo tilt and width from the design prototype's pastNode(). */
const HANDOFF_PHOTOS: Photo[] = [
  { key: 'g1', src: '/photos/g1.jpg', title: 'ICDC 2026 in Atlanta', tilt: -3, width: 230 },
  { key: 'g4', src: '/photos/g4.jpg', title: 'SCDC 2025', tilt: 2, width: 205 },
  { key: 'g3', src: '/photos/g3.jpg', title: 'ICDC 2025 in Orlando', tilt: -2, width: 190 },
  { key: 'g11', src: '/photos/g11.jpg', title: 'Another one!', tilt: 3, width: 215 },
  { key: 'g8', src: '/photos/g8.jpg', title: 'DECA Dinner', tilt: -1, width: 180 },
  { key: 'g6', src: '/photos/g6.jpg', title: 'DECA Board 24-25', tilt: 2, width: 240 },
  { key: 'g7', src: '/photos/g7.jpg', title: 'Another 24-25 Board pic!', tilt: -3, width: 200 },
  { key: 'g2', src: '/photos/g2.jpg', title: 'ICDC 2026 Top Placers', tilt: 1, width: 225 },
  { key: 'g9', src: '/photos/g9.jpg', title: "Emily's Glass!", tilt: -2, width: 175 },
  { key: 'g10', src: '/photos/g10.jpg', title: "Mia's Glass!", tilt: 3, width: 175 },
];

// Uploaded photos carry no tilt/width, so cycle the design's values to keep the wall irregular.
const TILT_CYCLE = [-3, 2, -2, 3, -1, 2, -3, 1, -2, 3];
const WIDTH_CYCLE = [230, 205, 190, 215, 180, 240, 200, 225, 175, 175];

export default async function PastConferencesPage() {
  const supabase = await createClient();
  const { data: uploaded } = await supabase
    .from('gallery_photos')
    .select('id, event_name, location, caption, storage_path')
    .order('sort_order');

  const photos: Photo[] =
    uploaded && uploaded.length > 0
      ? uploaded.map((p, i) => ({
          key: p.id,
          src: supabase.storage.from('gallery').getPublicUrl(p.storage_path).data.publicUrl,
          title: p.caption || p.event_name,
          subtitle: p.location,
          tilt: TILT_CYCLE[i % TILT_CYCLE.length]!,
          width: WIDTH_CYCLE[i % WIDTH_CYCLE.length]!,
        }))
      : HANDOFF_PHOTOS;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        // DECA's 2026 "Next Big Thing" starfield. backgroundColor matches the artwork's navy so
        // the page still reads correctly above/below the image on very tall or wide viewports.
        backgroundColor: '#141a4d',
        backgroundImage: "url('/photos/nbt-background.webp')",
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <SiteHeader />
      {/* Left-aligned and capped at 72vw: the "Next Big Thing" lockup sits at roughly 78% of the
          viewport width in the background art, so a centred 1100px column ran the last photo
          underneath it. Tying the column to vw keeps that clearance at any width. */}
      <main
        style={{
          flex: 1,
          maxWidth: 'min(1100px, 66vw)',
          width: '100%',
          marginLeft: 'clamp(22px, 5vw, 90px)',
          marginRight: 'auto',
          padding: '30px 22px 60px',
        }}
      >
        <h1 style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 26, color: '#fff', marginBottom: 4, textShadow: '0 2px 18px rgba(6,10,40,.6)' }}>
          Past Conferences
        </h1>
        <PolaroidWall photos={photos} />
      </main>
    </div>
  );
}
