import { createClient } from '@/lib/supabase/server';
import { Header, type HeaderStats } from '@/components/layout/Header';

/**
 * The site header with the signed-in member's streak, level, XP, and DECA$. Every page renders
 * this rather than <Header> directly -- pages that skipped loading the profile used to fall back
 * to a logged-out "Log in" header even for signed-in members.
 */
export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let stats: HeaderStats | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('level, xp, xp_in_level, xp_next, deca_balance, streak_count, role')
      .eq('id', user.id)
      .single();
    if (profile) {
      stats = {
        level: profile.level as number,
        xp: profile.xp as number,
        xpInLevel: profile.xp_in_level as number,
        xpNext: profile.xp_next as number,
        decaBalance: profile.deca_balance as number,
        streakCount: profile.streak_count as number,
        isOfficer: profile.role === 'officer',
      };
    }
  }

  return <Header stats={stats} />;
}
