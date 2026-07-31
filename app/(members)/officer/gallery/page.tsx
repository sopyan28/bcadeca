import { createClient } from '@/lib/supabase/server';
import { colors, fonts, fieldStyle, pressedButton } from '@/lib/ui/tokens';
import { uploadGalleryPhoto, deleteGalleryPhoto } from '../actions';

export default async function OfficerGalleryPage() {
  const supabase = await createClient();
  const { data: photos } = await supabase
    .from('gallery_photos')
    .select('id, event_name, location, caption, storage_path')
    .order('sort_order');

  async function upload(formData: FormData) {
    'use server';
    await uploadGalleryPhoto(formData);
  }

  async function remove(formData: FormData) {
    'use server';
    await deleteGalleryPhoto(String(formData.get('id')), String(formData.get('storagePath')));
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>
      <form
        action={upload}
        encType="multipart/form-data"
        style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 15, color: colors.navy }}>Upload photo</div>
        <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
          Event name
          <input name="eventName" required style={{ ...fieldStyle, marginTop: 6 }} />
        </label>
        <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
          Location
          <input name="location" style={{ ...fieldStyle, marginTop: 6 }} />
        </label>
        <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
          Caption
          <textarea name="caption" rows={3} style={{ ...fieldStyle, marginTop: 6, resize: 'vertical' }} />
        </label>
        <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
          Photo
          <input name="file" type="file" required accept="image/*" style={{ ...fieldStyle, marginTop: 6, padding: 8 }} />
        </label>
        <button type="submit" style={{ ...pressedButton(colors.blue, colors.blueShadow), padding: '11px 0' }}>
          Upload
        </button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {(photos ?? []).map((p) => {
          const {
            data: { publicUrl },
          } = supabase.storage.from('gallery').getPublicUrl(p.storage_path);
          return (
            <div key={p.id} style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicUrl} alt={p.caption ?? p.event_name} style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 12.5, color: colors.navy }}>{p.event_name}</div>
                <form action={remove} style={{ marginTop: 6 }}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="storagePath" value={p.storage_path} />
                  <button type="submit" style={{ border: 'none', background: 'none', cursor: 'pointer', color: colors.redDark, fontWeight: 800, fontSize: 11.5 }}>
                    Delete
                  </button>
                </form>
              </div>
            </div>
          );
        })}
        {(!photos || photos.length === 0) && <div style={{ color: colors.textMuted, fontSize: 14 }}>No photos uploaded yet.</div>}
      </div>
    </div>
  );
}
