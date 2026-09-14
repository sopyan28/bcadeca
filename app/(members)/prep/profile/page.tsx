import { createClient } from '@/lib/supabase/server';
import { colors, fonts } from '@/lib/ui/tokens';
import { masteryPct, confidencePct } from '@/lib/algorithms/diagnosticElo';
import { RadarChart } from '@/components/diagnostic/RadarChart';
import { Penguin, type PenguinEquipped } from '@/components/penguin/Penguin';

/** Return shape of get_missed_question_review (supabase/migrations/0008_missed_question_review.sql). */
interface MissedReviewRow {
  attempt_id: number;
  kpi_area: string;
  question_text: string;
  chosen_text: string;
  correct_text: string;
  explanation: string;
  created_at: string;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: missed }, { data: areaAbility }, { data: equippedRows }] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_color, xp, level, xp_in_level, xp_next, deca_balance, streak_count').eq('id', user.id).single(),
    supabase.rpc('get_missed_question_review', { p_limit: 30 }),
    supabase.from('user_kpi_ability').select('kpi_area, rating, rd, items_answered').eq('user_id', user.id).order('rating', { ascending: true }),
    supabase.from('user_equipped').select('slot, item_id, shop_items(icon)').eq('user_id', user.id),
  ]);

  // set-returning RPC; the un-parameterized client can't infer the row array shape yet.
  const missedRows = (missed ?? []) as unknown as MissedReviewRow[];

  const equipped: PenguinEquipped = {};
  for (const row of equippedRows ?? []) {
    const icon = (row as unknown as { shop_items: { icon: string } | null }).shop_items?.icon;
    if (row.slot === 'hat') equipped.hatIcon = icon ?? undefined;
    if (row.slot === 'eyes') equipped.eyesIcon = icon ?? undefined;
    if (row.slot === 'neck') equipped.neckItemId = row.item_id;
    if (row.slot === 'hand') equipped.handIcon = icon ?? undefined;
  }

  const radarData = (areaAbility ?? []).map((a) => ({
    kpi_area: a.kpi_area,
    mastery_pct: masteryPct(a.rating),
    confidence_pct: confidencePct(a.rd),
    low_data: a.items_answered < 5,
  }));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
      <div style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 22, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', transform: 'scale(1.3)', margin: '8px 0 6px' }}>
          <Penguin color={profile?.avatar_color ?? '#28a3ee'} equipped={equipped} />
        </div>
        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 17, color: colors.navy, marginTop: 6 }}>
          {profile?.full_name}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 18 }}>
          <div>
            <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 20, color: colors.blue }}>{profile?.level}</div>
            <div style={{ fontSize: 11, color: colors.textMuted, fontWeight: 700 }}>Level</div>
          </div>
          <div>
            <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 20, color: colors.blue }}>{profile?.xp}</div>
            <div style={{ fontSize: 11, color: colors.textMuted, fontWeight: 700 }}>Total XP</div>
          </div>
          <div>
            <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 20, color: colors.goldText }}>{profile?.deca_balance}</div>
            <div style={{ fontSize: 11, color: colors.textMuted, fontWeight: 700 }}>DECA$</div>
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: 12.5, color: '#a9690a', fontWeight: 700 }}>🔥 {profile?.streak_count}-day streak</div>

        {areaAbility && areaAbility.length > 0 && (
          <div style={{ marginTop: 22, textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
              Weakest areas
            </div>
            {areaAbility.slice(0, 5).map((a) => (
              <div key={a.kpi_area} style={{ fontSize: 12.5, color: colors.navy, padding: '4px 0' }}>
                {a.kpi_area}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 22 }}>
          <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 16, color: colors.navy, marginBottom: 14 }}>
            Strongest &amp; weakest areas
          </div>
          {radarData.length > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RadarChart data={radarData} />
            </div>
          ) : (
            <div style={{ color: colors.textMuted, fontSize: 14 }}>Take a diagnostic to reveal your KPI-area breakdown.</div>
          )}
        </div>

        <div style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 22 }}>
          <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 16, color: colors.navy, marginBottom: 14 }}>
            Questions you&apos;ve missed
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {missedRows.map((m) => (
              <div key={m.attempt_id} style={{ background: '#fff4f3', border: '1.5px solid #f6d4d1', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, color: colors.redDark, marginBottom: 5 }}>
                  {m.kpi_area}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.navy, lineHeight: 1.4, marginBottom: 7 }}>{m.question_text}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.redDark, marginBottom: 2 }}>✗ You: {m.chosen_text}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.green, marginBottom: 6 }}>✓ Correct: {m.correct_text}</div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.textSecondary, lineHeight: 1.4, borderTop: '1px solid #f0dcda', paddingTop: 6 }}>
                  {m.explanation}
                </div>
              </div>
            ))}
            {missedRows.length === 0 && (
              <div style={{ color: colors.textMuted, fontSize: 14 }}>No missed questions yet -- nice work!</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
