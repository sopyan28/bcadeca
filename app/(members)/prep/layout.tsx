'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fonts } from '@/lib/ui/tokens';

const TABS = [
  { href: '/prep/arena', label: 'Arena', icon: '🧊' },
  { href: '/prep/diagnostic', label: 'Diagnostic', icon: '📊' },
  { href: '/prep/events', label: 'Event Resources', icon: '📁' },
  { href: '/prep/profile', label: 'My Profile', icon: '👤' },
];

export default function PrepLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <nav style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {TABS.map((tab) => {
          const on = pathname?.startsWith(tab.href) ?? false;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                border: 'none',
                cursor: 'pointer',
                fontFamily: fonts.body,
                fontWeight: 800,
                fontSize: 13,
                padding: '8px 15px',
                borderRadius: 5,
                background: on ? '#28a3ee' : '#fff',
                color: on ? '#fff' : '#3f86bf',
                boxShadow: on ? '0 3px 0 #1366b3' : '0 2px 0 #d7e8f5',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                textDecoration: 'none',
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
