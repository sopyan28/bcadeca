import { createClient } from '@/lib/supabase/server';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { PracticeRunner } from '@/components/practice/PracticeRunner';
import { ShopGrid, type ShopItemRow } from '@/components/shop/ShopGrid';
import { ArenaSidebar } from '@/components/arena/ArenaSidebar';
import { MissedList, type MissedRow } from '@/components/arena/MissedList';

export default async function ArenaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: leaderboardRows },
    { data: memberCount },
    { data: activeCount },
    { data: shopItems },
    { data: inventory },
    { data: equipped },
    { data: profile },
    { data: questionClusters },
    { data: missed },
  ] = await Promise.all([
    supabase.from('public_profiles').select('id, full_name, xp, level, avatar_color, streak_count').order('xp', { ascending: false }).limit(25),
    supabase.rpc('member_count'),
    // Defined in migration 0013. Until that's run this errors, data stays null, and the leaderboard just omits it.
    supabase.rpc('active_member_count', { p_days: 7 }),
    supabase.from('shop_items').select('id, name, icon, kind, slot, price').eq('active', true),
    user ? supabase.from('user_inventory').select('item_id').eq('user_id', user.id) : Promise.resolve({ data: [] as { item_id: string }[] }),
    user ? supabase.from('user_equipped').select('slot, item_id').eq('user_id', user.id) : Promise.resolve({ data: [] as { slot: string; item_id: string }[] }),
    user ? supabase.from('profiles').select('deca_balance').eq('id', user.id).single() : Promise.resolve({ data: null }),
    supabase.from('questions_public').select('cluster'),
    user ? supabase.rpc('get_missed_question_review', { p_limit: 30 }) : Promise.resolve({ data: [] as MissedRow[] }),
  ]);

  const equippedBySlot = Object.fromEntries((equipped ?? []).map((e) => [e.slot, e.item_id]));
  const clusters = Array.from(new Set((questionClusters ?? []).map((q) => q.cluster))).sort();
  const missedRows = (missed ?? []) as MissedRow[];

  // Sidebar left, ocean right -- the arena layout from the design prototype's arenaMain().
  // Stacks on narrow screens; see .arena-grid in globals.css.
  return (
    <div className="arena-grid">
      <ArenaSidebar
        missedCount={missedRows.length}
        practice={<PracticeRunner clusters={clusters} />}
        missed={<MissedList rows={missedRows} />}
        shop={
          <ShopGrid
            items={(shopItems ?? []) as ShopItemRow[]}
            ownedItemIds={(inventory ?? []).map((i) => i.item_id)}
            equippedBySlot={equippedBySlot}
            decaBalance={profile?.deca_balance ?? 0}
          />
        }
      />
      <Leaderboard
        initialRows={leaderboardRows ?? []}
        currentUserId={user?.id ?? ''}
        memberCount={memberCount == null ? null : Number(memberCount)}
        activeCount={activeCount == null ? null : Number(activeCount)}
      />
    </div>
  );
}
