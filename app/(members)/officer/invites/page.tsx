import { createClient } from '@/lib/supabase/server';
import { colors, fonts, fieldStyle, pressedButton } from '@/lib/ui/tokens';
import { createInviteCode, deactivateInviteCode } from '../actions';

export default async function OfficerInvitesPage() {
  const supabase = await createClient();
  const { data: codes } = await supabase
    .from('officer_invite_codes')
    .select('code, uses, max_uses, expires_at, active')
    .order('code');

  async function create(formData: FormData) {
    'use server';
    await createInviteCode(formData);
  }

  async function deactivate(formData: FormData) {
    'use server';
    await deactivateInviteCode(String(formData.get('code')));
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>
      <form action={create} style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 15, color: colors.navy }}>New DECA Board invite code</div>
        <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
          Code
          <input name="code" required placeholder="BCA-DECA-2027" style={{ ...fieldStyle, marginTop: 6 }} />
        </label>
        <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
          Max uses
          <input name="maxUses" type="number" min={1} defaultValue={1} style={{ ...fieldStyle, marginTop: 6 }} />
        </label>
        <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
          Expires in (days)
          <input name="expiresInDays" type="number" min={1} defaultValue={60} style={{ ...fieldStyle, marginTop: 6 }} />
        </label>
        <button type="submit" style={{ ...pressedButton(colors.blue, colors.blueShadow), padding: '11px 0' }}>
          Create code
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(codes ?? []).map((c) => (
          <div key={c.code} style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: colors.navy, fontFamily: 'monospace' }}>{c.code}</div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {c.uses}/{c.max_uses} used &middot; expires {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'never'}
                {!c.active && ' · inactive'}
              </div>
            </div>
            {c.active && (
              <form action={deactivate}>
                <input type="hidden" name="code" value={c.code} />
                <button type="submit" style={{ border: 'none', background: 'none', cursor: 'pointer', color: colors.redDark, fontWeight: 800, fontSize: 12.5 }}>
                  Deactivate
                </button>
              </form>
            )}
          </div>
        ))}
        {(!codes || codes.length === 0) && <div style={{ color: colors.textMuted, fontSize: 14 }}>No invite codes yet.</div>}
      </div>
    </div>
  );
}
