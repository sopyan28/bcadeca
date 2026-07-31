import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { colors } from '@/lib/ui/tokens';

export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/members');

  const { data: profile } = await supabase
    .from('profiles')
    .select('level, xp, xp_in_level, xp_next, deca_balance, streak_count, role')
    .eq('id', user.id)
    .single();

  const stats = profile
    ? {
        level: profile.level as number,
        xp: profile.xp as number,
        xpInLevel: profile.xp_in_level as number,
        xpNext: profile.xp_next as number,
        decaBalance: profile.deca_balance as number,
        streakCount: profile.streak_count as number,
        isOfficer: profile.role === 'officer',
      }
    : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bg }}>
      <Header stats={stats} />
      <div style={{ flex: 1, maxWidth: 1180, width: '100%', margin: '0 auto', padding: '20px 18px 40px' }}>
        {children}
      </div>
    </div>
  );
}
