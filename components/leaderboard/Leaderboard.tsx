'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { colors, fonts } from '@/lib/ui/tokens';
import { Penguin } from '@/components/penguin/Penguin';

export interface LeaderboardRow {
  id: string;
  full_name: string;
  xp: number;
  level: number;
  avatar_color: string;
  streak_count: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function Leaderboard({ initialRows, currentUserId }: { initialRows: LeaderboardRow[]; currentUserId: string }) {
  const [rows, setRows] = useState(initialRows);

  useEffect(() => {
    const supabase = createClient();

    async function refetch() {
      const { data } = await supabase
        .from('public_profiles')
        .select('id, full_name, xp, level, avatar_color, streak_count')
        .order('xp', { ascending: false })
        .limit(25);
      if (data) setRows(data as LeaderboardRow[]);
    }

    const channel = supabase
      .channel('leaderboard-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, refetch)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: `2px solid ${colors.borderFaint}`, fontFamily: fonts.heading, fontWeight: 700, fontSize: 16, color: colors.navy }}>
        🏆 Leaderboard
      </div>
      <div>
        {rows.map((row, i) => (
          <div
            key={row.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 18px',
              background: row.id === currentUserId ? '#eaf6ff' : 'transparent',
              borderBottom: `1px solid ${colors.borderFaint}`,
            }}
          >
            <div style={{ width: 24, textAlign: 'center', fontWeight: 800, fontSize: 14, color: colors.textMuted }}>
              {MEDALS[i] ?? i + 1}
            </div>
            <div style={{ width: 30, height: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
              <div style={{ transform: 'scale(0.6)', transformOrigin: 'bottom center' }}>
                <Penguin color={row.avatar_color} />
              </div>
            </div>
            <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: colors.navy }}>{row.full_name || 'Member'}</div>
            {row.streak_count > 0 && <div style={{ fontSize: 12, color: '#a9690a', fontWeight: 700 }}>🔥{row.streak_count}</div>}
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted }}>LVL {row.level}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: colors.blue, minWidth: 60, textAlign: 'right' }}>{row.xp} XP</div>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: colors.textMuted, fontSize: 14 }}>No members yet.</div>
        )}
      </div>
    </div>
  );
}
