import { createClient } from '@/lib/supabase/server';
import { colors, fonts, fieldStyle, pressedButton } from '@/lib/ui/tokens';
import { createAnnouncement, deleteAnnouncement } from '../actions';

export default async function OfficerAnnouncementsPage() {
  const supabase = await createClient();
  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, title, body, kind, pinned, created_at')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  async function create(formData: FormData) {
    'use server';
    await createAnnouncement(formData);
  }

  async function remove(formData: FormData) {
    'use server';
    await deleteAnnouncement(String(formData.get('id')));
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>
      <form action={create} style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 15, color: colors.navy }}>New announcement</div>
        <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
          Title
          <input name="title" required style={{ ...fieldStyle, marginTop: 6 }} />
        </label>
        <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
          Body
          <textarea name="body" required rows={4} style={{ ...fieldStyle, marginTop: 6, resize: 'vertical' }} />
        </label>
        <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
          Kind
          <select name="kind" defaultValue="general" style={{ ...fieldStyle, marginTop: 6 }}>
            <option value="general">General</option>
            <option value="pinned">Pinned</option>
            <option value="fundraiser">Fundraiser</option>
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
          <input type="checkbox" name="pinned" /> Pin to top
        </label>
        <button type="submit" style={{ ...pressedButton(colors.blue, colors.blueShadow), padding: '11px 0' }}>
          Post announcement
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(announcements ?? []).map((a) => (
          <div key={a.id} style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: colors.navy }}>
                  {a.pinned && '📌 '}
                  {a.title}
                </div>
                <div style={{ fontSize: 13.5, color: colors.textSecondary, marginTop: 4, lineHeight: 1.5 }}>{a.body}</div>
              </div>
              <form action={remove}>
                <input type="hidden" name="id" value={a.id} />
                <button
                  type="submit"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: colors.redDark, fontWeight: 800, fontSize: 12.5 }}
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {(!announcements || announcements.length === 0) && (
          <div style={{ color: colors.textMuted, fontSize: 14 }}>No announcements yet.</div>
        )}
      </div>
    </div>
  );
}
