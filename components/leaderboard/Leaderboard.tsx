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

/**
 * The iceberg leaderboard from the design prototype's arenaMain()/podium(): members stand
 * on ice columns whose height scales with XP, floating above the water line. Ranks read
 * left-to-right and the row scrolls horizontally, so the whole chapter fits without the
 * scene collapsing into a list.
 */
const SCENE_HEIGHT = 430;
const MIN_COLUMN = 26;
const MAX_COLUMN = 210;
const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function columnWidth(rank: number) {
  if (rank === 1) return 92;
  if (rank <= 3) return 80;
  if (rank <= 6) return 68;
  return 56;
}

function penguinScale(rank: number) {
  if (rank === 1) return 1.08;
  if (rank <= 3) return 0.98;
  if (rank <= 6) return 0.86;
  return 0.74;
}

function Podium({ row, rank, maxXp, isMe }: { row: LeaderboardRow; rank: number; maxXp: number; isMe: boolean }) {
  const height = Math.round(MIN_COLUMN + (row.xp / maxXp) * (MAX_COLUMN - MIN_COLUMN));
  const width = columnWidth(rank);
  const medal = MEDALS[rank];
  const iceGradient = isMe
    ? 'linear-gradient(180deg,#fff4c4,#ffe27a 55%,#f4c63a)'
    : 'linear-gradient(180deg,#eaf8ff,#bfe6fb 55%,#8fcdf0)';

  return (
    <div style={{ flex: '0 0 auto', width: 118, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 5 }}>
        {medal && <div style={{ fontSize: rank === 1 ? 24 : 19, lineHeight: 1, marginBottom: 1, filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.15))' }}>{medal}</div>}
        <div style={{ fontWeight: 800, fontSize: isMe ? 13 : 12, color: isMe ? colors.goldText : colors.navy, whiteSpace: 'nowrap', maxWidth: 116, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.full_name || 'Member'}
          {isMe ? ' ★' : ''}
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'baseline' }}>
          <span style={{ fontWeight: 800, fontSize: 11, color: isMe ? '#c79100' : '#5a86b0' }}>⚡ {row.xp}</span>
          {row.streak_count > 0 && <span style={{ fontWeight: 800, fontSize: 10.5, color: '#a9690a' }}>🔥{row.streak_count}</span>}
        </div>
      </div>

      <div style={{ transform: `scale(${penguinScale(rank)})`, transformOrigin: 'bottom center' }}>
        <div style={{ animation: `pfloat ${(2.6 + rank * 0.13).toFixed(2)}s ease-in-out infinite`, transformOrigin: 'bottom center' }}>
          <Penguin color={row.avatar_color} />
        </div>
      </div>

      <div
        title={`Level ${row.level} · ${row.xp} XP`}
        style={{
          position: 'relative',
          width,
          height,
          background: iceGradient,
          border: `2px solid ${isMe ? '#f0bd2e' : '#cdeafc'}`,
          borderBottom: 'none',
          borderRadius: '10px 10px 0 0',
          marginTop: 3,
          boxShadow: 'inset 0 8px 12px rgba(255,255,255,.55), 0 6px 14px rgba(40,120,200,.12)',
          transition: 'height .5s cubic-bezier(.34,1.2,.4,1)',
        }}
      >
        <div style={{ position: 'absolute', top: 6, left: 7, width: 6, height: Math.max(10, height * 0.4), background: 'rgba(255,255,255,.6)', borderRadius: 3 }} />
        <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', fontWeight: 800, fontSize: 13, color: isMe ? 'rgba(120,90,0,.6)' : 'rgba(40,110,170,.55)' }}>
          {rank}
        </div>
      </div>
    </div>
  );
}

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

  // Everyone at 0 XP would divide by zero and flatten the ice to nothing; floor it at 1.
  const maxXp = Math.max(rows[0]?.xp ?? 0, 1);

  return (
    <div style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 9, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: `2px solid ${colors.borderFaint}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 18, color: colors.navy }}>🏆 The Leaderboard</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#1c7fc4', background: '#e9f6ff', border: '1.5px solid #bfe2fa', borderRadius: 10, padding: '5px 12px', whiteSpace: 'nowrap' }}>
          {rows.length} member{rows.length === 1 ? '' : 's'}
        </div>
      </div>

      <div style={{ position: 'relative', height: SCENE_HEIGHT, background: 'linear-gradient(180deg,#d6efff 0%,#eaf8ff 55%,#cdebfb 100%)' }}>
        <div style={{ position: 'absolute', top: 26, right: 40, width: 54, height: 54, borderRadius: '50%', background: 'radial-gradient(circle,#fff3b0,#ffe27a)', boxShadow: '0 0 36px rgba(255,220,110,.7)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 90, background: 'linear-gradient(180deg,#5cb8ef,#2f97e0)', borderTop: '3px solid rgba(255,255,255,.5)', zIndex: 1 }} />

        {rows.length > 0 ? (
          <div style={{ position: 'absolute', inset: 0, overflowX: 'auto', overflowY: 'hidden', display: 'flex', alignItems: 'flex-end', gap: 6, padding: '18px 26px 70px', zIndex: 2 }}>
            {rows.map((row, i) => (
              <Podium key={row.id} row={row} rank={i + 1} maxXp={maxXp} isMe={row.id === currentUserId} />
            ))}
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, color: colors.textSecondary, fontSize: 14, fontWeight: 700 }}>
            No members on the ice yet — answer some questions to claim the top.
          </div>
        )}
      </div>
    </div>
  );
}
