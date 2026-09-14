'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors, fonts } from '@/lib/ui/tokens';
import { signOut } from '@/app/(auth)/actions';

export interface HeaderStats {
  level: number;
  xp: number;
  xpInLevel: number;
  xpNext: number;
  decaBalance: number;
  streakCount: number;
  isOfficer?: boolean;
}

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/find-your-event', label: 'Find Your Event' },
  { href: '/members', label: 'Members' },
  { href: '/prep', label: 'Prep' },
  { href: '/past-conferences', label: 'Past Conferences' },
];

/**
 * Pages render this through <SiteHeader />, which loads the member's stats, so it looks the same
 * everywhere. Nothing in the row wraps: the logo and stats hold their size, and if the row runs
 * out of room the nav links scroll sideways instead (.site-nav in globals.css).
 */
export function Header({ stats }: { stats?: HeaderStats | null }) {
  const pathname = usePathname();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        background: '#fff',
        borderBottom: `2px solid ${colors.borderLight}`,
        boxShadow: '0 2px 14px rgba(40,120,200,.07)',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '11px 22px', display: 'flex', alignItems: 'center', gap: 18 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 6,
              background: 'linear-gradient(160deg,#34a9ee,#1366b3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              boxShadow: '0 3px 0 #0f5497',
            }}
          >
            🐧
          </div>
          <div style={{ lineHeight: 1.05, whiteSpace: 'nowrap' }}>
            <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 19, color: colors.navy }}>
              BCA <span style={{ color: '#1b8ad6' }}>DECA</span>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: colors.textMuted }}>
              Bergen County Academies
            </div>
          </div>
        </Link>

        <nav className="site-nav" style={{ display: 'flex', gap: 4, marginLeft: 8, minWidth: 0 }}>
          {(stats?.isOfficer ? [...NAV_LINKS, { href: '/officer', label: 'Board' }] : NAV_LINKS).map((link) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  position: 'relative',
                  fontFamily: fonts.body,
                  fontWeight: 800,
                  fontSize: 14,
                  padding: '9px 14px',
                  borderRadius: 5,
                  color: isActive ? '#1b8ad6' : colors.navy,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {link.label}
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 14,
                      right: 14,
                      bottom: 1,
                      height: 3,
                      borderRadius: 3,
                      background: '#1b8ad6',
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        {stats ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, whiteSpace: 'nowrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: '#fff3d6',
                border: '1.5px solid #ffd97a',
                borderRadius: 10,
                padding: '5px 11px',
                fontWeight: 800,
                fontSize: 13,
                color: '#a9690a',
              }}
            >
              🔥 {stats.streakCount}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#e9f6ff',
                border: '1.5px solid #bfe2fa',
                borderRadius: 10,
                padding: '4px 11px 4px 9px',
              }}
            >
              <span style={{ fontSize: 14 }}>⚡</span>
              <div style={{ lineHeight: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#3f86bf', letterSpacing: 0.3 }}>
                  LVL {stats.level}
                </div>
                <div style={{ width: 54, height: 5, background: '#cfe6f7', borderRadius: 3, overflow: 'hidden', marginTop: 2 }}>
                  <div
                    style={{
                      height: '100%',
                      background: colors.blue,
                      borderRadius: 3,
                      width: `${Math.min(100, Math.round((stats.xpInLevel / Math.max(stats.xpNext, 1)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#1c7fc4' }}>{stats.xp} XP</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: colors.goldBg,
                border: '1.5px solid #ffe08a',
                borderRadius: 10,
                padding: '5px 11px',
                fontWeight: 800,
                fontSize: 13,
                color: colors.goldText,
              }}
            >
              💰 {stats.decaBalance}
            </div>
            <form action={signOut}>
              <button
                type="submit"
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontFamily: fonts.body,
                  fontWeight: 800,
                  fontSize: 13,
                  color: colors.textSecondary,
                  whiteSpace: 'nowrap',
                }}
              >
                Log out
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            style={{
              fontFamily: fonts.body,
              fontWeight: 800,
              fontSize: 14,
              color: '#fff',
              background: colors.blue,
              padding: '9px 16px',
              borderRadius: 6,
              boxShadow: `0 4px 0 ${colors.blueShadow}`,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
