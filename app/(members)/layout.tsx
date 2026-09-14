import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { colors } from '@/lib/ui/tokens';

export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/members');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bg }}>
      <SiteHeader />
      <div style={{ flex: 1, maxWidth: 1180, width: '100%', margin: '0 auto', padding: '20px 18px 40px' }}>
        {children}
      </div>
    </div>
  );
}
