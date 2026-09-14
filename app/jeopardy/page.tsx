import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'DECA Jeopardy | BCA DECA',
};

// Ravi Roy's NJ DECA Jeopardy, embedded rather than copied in so updates to that deployment show up
// here automatically. The host screen and players' phones sync over public MQTT brokers, which work
// fine from inside a frame; players join with the room code shown on the host screen.
const JEOPARDY_URL = 'https://njdeca-jeopardy.vercel.app/';

export default async function JeopardyPage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();

  let stats = null;
  if (userRes.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('level, xp, xp_in_level, xp_next, deca_balance, streak_count, role')
      .eq('id', userRes.user.id)
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

  return (
    <div className="jeopardy-page">
      <Header stats={stats} />
      {/* fullscreen: hosts press F to project the board; autoplay: the game's sound effects. */}
      <iframe src={JEOPARDY_URL} title="NJ DECA Jeopardy" className="jeopardy-frame" allow="fullscreen; autoplay" allowFullScreen />
    </div>
  );
}
