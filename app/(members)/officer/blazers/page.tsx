import { createClient } from '@/lib/supabase/server';
import { colors, fonts, fieldStyle, pressedButton } from '@/lib/ui/tokens';
import { BLAZER_GROUPS, blazerKey } from '@/lib/blazers';
import { setBlazerCount } from '../actions';

export default async function OfficerBlazersPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from('blazer_inventory').select('size, count');
  const countBySize = new Map((rows ?? []).map((r) => [r.size, r.count]));

  async function update(formData: FormData) {
    'use server';
    const size = String(formData.get('size'));
    const count = Number(formData.get('count'));
    await setBlazerCount(size, Number.isFinite(count) ? count : 0);
  }

  return (
    <div style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 22, maxWidth: 480 }}>
      <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 16, color: colors.navy, marginBottom: 14 }}>
        Blazer inventory
      </div>
      {BLAZER_GROUPS.map((group) => (
        <div key={group.key} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textFaint, marginBottom: 8 }}>
            {group.label}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {group.sizes.map((size) => {
              const key = blazerKey(group.key, size);
              return (
                <form key={key} action={update} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="hidden" name="size" value={key} />
                  <div style={{ width: 48, fontWeight: 800, fontSize: 14, color: colors.navy }}>{size}</div>
                  <input
                    name="count"
                    type="number"
                    min={0}
                    defaultValue={countBySize.get(key) ?? 0}
                    style={{ ...fieldStyle, width: 90 }}
                  />
                  <button type="submit" style={{ ...pressedButton(colors.blue, colors.blueShadow), padding: '9px 16px', fontSize: 13 }}>
                    Save
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
