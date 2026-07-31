import { createClient } from '@/lib/supabase/server';
import { colors, fonts, pressedButton } from '@/lib/ui/tokens';
import { updateTrifoldStatus } from '../actions';

const STATUS_COLORS: Record<string, string> = {
  pending: colors.goldText,
  approved: colors.green,
  denied: colors.redDark,
  fulfilled: colors.blue,
};

export default async function OfficerTrifoldsPage() {
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from('trifold_requests')
    .select('id, event_name, event_date, status, notes, created_at')
    .order('created_at', { ascending: false });

  async function setStatus(formData: FormData) {
    'use server';
    const id = String(formData.get('id'));
    const status = String(formData.get('status')) as 'pending' | 'approved' | 'denied' | 'fulfilled';
    await updateTrifoldStatus(id, status);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {(requests ?? []).map((r) => (
        <div key={r.id} style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: colors.navy }}>{r.event_name}</div>
              <div style={{ fontSize: 12.5, color: colors.textMuted, marginTop: 2 }}>{r.event_date}</div>
              {r.notes && <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 6 }}>{r.notes}</div>}
              <div style={{ fontSize: 12.5, fontWeight: 800, color: STATUS_COLORS[r.status] ?? colors.textMuted, marginTop: 8 }}>
                {r.status}
              </div>
            </div>
            <form action={setStatus} style={{ display: 'flex', gap: 6 }}>
              <input type="hidden" name="id" value={r.id} />
              {(['approved', 'denied', 'fulfilled'] as const).map((s) => (
                <button
                  key={s}
                  type="submit"
                  name="status"
                  value={s}
                  style={{ ...pressedButton(colors.blue, colors.blueShadow), padding: '7px 12px', fontSize: 12 }}
                >
                  {s}
                </button>
              ))}
            </form>
          </div>
        </div>
      ))}
      {(!requests || requests.length === 0) && (
        <div style={{ color: colors.textMuted, fontSize: 14 }}>No trifold requests yet.</div>
      )}
    </div>
  );
}
