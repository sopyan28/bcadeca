import type { CSSProperties } from 'react';

export interface PenguinEquipped {
  hatIcon?: string;
  eyesIcon?: string;
  neckItemId?: string;
  handIcon?: string;
}

const base: CSSProperties = { position: 'absolute' };

export function Penguin({ color, equipped }: { color: string; equipped?: PenguinEquipped }) {
  const eq = equipped ?? {};
  const scarfColor = eq.neckItemId === 'scarfR' ? '#e8483f' : color;

  return (
    <div style={{ position: 'relative', width: 50, height: 68 }}>
      {eq.hatIcon && (
        <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', fontSize: 22, zIndex: 10, lineHeight: 1 }}>
          {eq.hatIcon}
        </div>
      )}

      <div
        style={{
          ...base,
          top: 30,
          left: 0,
          width: 11,
          height: 21,
          background: 'radial-gradient(ellipse at 50% 30%,#3a3f46,#1d2227)',
          borderRadius: '40% 60% 60% 40%',
          transform: 'rotate(-16deg)',
          zIndex: 0,
        }}
      />
      <div
        style={{
          ...base,
          top: 30,
          right: 0,
          width: 11,
          height: 21,
          background: 'radial-gradient(ellipse at 50% 30%,#3a3f46,#1d2227)',
          borderRadius: '40% 60% 60% 40%',
          transform: 'rotate(16deg) scaleX(-1)',
          zIndex: 0,
        }}
      />

      <div
        style={{
          ...base,
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 40,
          height: 50,
          background: 'radial-gradient(ellipse at 35% 28%,#3a3f46,#1b2026)',
          borderRadius: '50% 50% 45% 45%',
          zIndex: 1,
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 5,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 23,
            height: 30,
            background: 'radial-gradient(ellipse at 40% 32%,#ffffff,#e6edf2)',
            borderRadius: '50% 50% 45% 45%',
          }}
        />
      </div>

      <div
        style={{
          ...base,
          top: 27,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 30,
          height: 8,
          background: scarfColor,
          borderRadius: 3,
          zIndex: 4,
          boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.15)',
        }}
      />
      {eq.neckItemId === 'bowtie' && (
        <div style={{ ...base, top: 25, left: '50%', transform: 'translateX(-50%)', fontSize: 13, zIndex: 5, lineHeight: 1 }}>🎀</div>
      )}

      <div
        style={{
          ...base,
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 34,
          height: 34,
          background: 'radial-gradient(ellipse at 38% 30%,#42474e,#1b2026)',
          borderRadius: '50%',
          zIndex: 3,
        }}
      >
        <div style={{ position: 'absolute', top: 11, left: 6, width: 6, height: 7, background: '#fff', borderRadius: '50%' }}>
          <div style={{ position: 'absolute', top: 2, left: 1.5, width: 3, height: 3, background: '#15181c', borderRadius: '50%' }} />
        </div>
        <div style={{ position: 'absolute', top: 11, right: 6, width: 6, height: 7, background: '#fff', borderRadius: '50%' }}>
          <div style={{ position: 'absolute', top: 2, left: 1.5, width: 3, height: 3, background: '#15181c', borderRadius: '50%' }} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 19,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 8,
            height: 6,
            background: '#f5a623',
            clipPath: 'polygon(50% 100%,0 0,100% 0)',
          }}
        />
        {eq.eyesIcon && (
          <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', fontSize: 16, zIndex: 6, lineHeight: 1 }}>
            {eq.eyesIcon}
          </div>
        )}
      </div>

      <div style={{ ...base, bottom: -4, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5, zIndex: 5 }}>
        <div style={{ width: 12, height: 6, background: '#f5a623', borderRadius: '40% 40% 50% 50%' }} />
        <div style={{ width: 12, height: 6, background: '#f5a623', borderRadius: '40% 40% 50% 50%' }} />
      </div>

      {eq.handIcon && (
        <div style={{ position: 'absolute', bottom: 2, right: -14, fontSize: 16, zIndex: 10, lineHeight: 1 }}>{eq.handIcon}</div>
      )}
    </div>
  );
}
