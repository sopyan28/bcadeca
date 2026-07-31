import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { colors, fonts } from '@/lib/ui/tokens';

const TABS = [
  { href: '/officer/announcements', label: 'Announcements' },
  { href: '/officer/blazers', label: 'Blazers' },
  { href: '/officer/trifolds', label: 'Trifolds' },
  { href: '/officer/documents', label: 'Documents' },
  { href: '/officer/gallery', label: 'Gallery' },
  { href: '/officer/invites', label: 'Invites' },
];

export default async function OfficerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/officer/announcements');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'officer') redirect('/prep/arena');

  return (
    <div>
      <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 19, color: colors.navy, marginBottom: 14 }}>
        Officer tools
      </div>
      <nav style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: `2px solid ${colors.border}`, paddingBottom: 2 }}>
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              fontFamily: fonts.body,
              fontWeight: 800,
              fontSize: 14,
              color: colors.navy,
              padding: '10px 16px',
              borderRadius: '8px 8px 0 0',
            }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
