'use client';

import { useState, useTransition } from 'react';
import { colors, fonts, pressedButton } from '@/lib/ui/tokens';
import { purchaseItem, equipItem } from '@/app/(members)/prep/arena/actions';

export interface ShopItemRow {
  id: string;
  name: string;
  icon: string;
  kind: 'outfit' | 'emote' | 'power';
  slot: string | null;
  price: number;
}

export function ShopGrid({
  items,
  ownedItemIds,
  equippedBySlot,
  decaBalance,
}: {
  items: ShopItemRow[];
  ownedItemIds: string[];
  equippedBySlot: Record<string, string>;
  decaBalance: number;
}) {
  const [owned, setOwned] = useState(new Set(ownedItemIds));
  const [equipped, setEquipped] = useState(equippedBySlot);
  const [balance, setBalance] = useState(decaBalance);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function buy(item: ShopItemRow) {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await purchaseItem(item.id);
        if (result.ok) {
          setOwned((prev) => new Set(prev).add(item.id));
          setBalance((b) => b - item.price);
        } else {
          setMessage(result.message);
        }
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Purchase failed');
      }
    });
  }

  function toggleEquip(item: ShopItemRow) {
    if (!item.slot) return;
    const isEquipped = equipped[item.slot] === item.id;
    startTransition(async () => {
      try {
        await equipItem(item.slot!, isEquipped ? null : item.id);
        setEquipped((prev) => {
          const next = { ...prev };
          if (isEquipped) delete next[item.slot!];
          else next[item.slot!] = item.id;
          return next;
        });
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Could not equip item');
      }
    });
  }

  // No card chrome: this renders inside the arena sidebar's panel, which supplies it.
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase', color: colors.textFaint }}>Shop</div>
        <div style={{ fontWeight: 800, fontSize: 13, color: colors.goldText }}>💰 {balance} DECA$</div>
      </div>

      {message && <div style={{ fontSize: 13, color: colors.redDark, fontWeight: 700, marginBottom: 10 }}>{message}</div>}

      {SECTIONS.map((section) => {
        const sectionItems = items.filter((item) => item.kind === section.kind);
        if (sectionItems.length === 0) return null;
        return (
          <div key={section.kind} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textFaint, marginBottom: 10 }}>
              {section.label}
            </div>
            <ShopSectionGrid items={sectionItems} owned={owned} equipped={equipped} balance={balance} isPending={isPending} onBuy={buy} onToggleEquip={toggleEquip} />
          </div>
        );
      })}
    </div>
  );
}

const SECTIONS: { kind: ShopItemRow['kind']; label: string }[] = [
  { kind: 'outfit', label: 'Outfits' },
  { kind: 'emote', label: 'Emotes' },
  { kind: 'power', label: 'Power-ups' },
];

function ShopSectionGrid({
  items,
  owned,
  equipped,
  balance,
  isPending,
  onBuy,
  onToggleEquip,
}: {
  items: ShopItemRow[];
  owned: Set<string>;
  equipped: Record<string, string>;
  balance: number;
  isPending: boolean;
  onBuy: (item: ShopItemRow) => void;
  onToggleEquip: (item: ShopItemRow) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: 10 }}>
        {items.map((item) => {
          const isOwned = owned.has(item.id);
          const isEquippable = item.kind !== 'power' && item.slot;
          const isEquipped = isEquippable && equipped[item.slot!] === item.id;

          return (
            <div key={item.id} style={{ border: `1.5px solid ${colors.borderFaint}`, borderRadius: 8, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 28 }}>{item.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 12.5, color: colors.navy, marginTop: 6 }}>{item.name}</div>
              {isOwned ? (
                isEquippable ? (
                  <button
                    disabled={isPending}
                    onClick={() => onToggleEquip(item)}
                    style={{
                      marginTop: 8,
                      padding: '6px 10px',
                      fontSize: 11.5,
                      fontWeight: 800,
                      borderRadius: 6,
                      border: `1.5px solid ${isEquipped ? colors.green : colors.borderLight}`,
                      background: isEquipped ? '#e7f8ee' : '#fff',
                      color: isEquipped ? colors.green : colors.textSecondary,
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    {isEquipped ? 'Equipped ✓' : 'Equip'}
                  </button>
                ) : (
                  <div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 800, color: colors.textMuted }}>Owned</div>
                )
              ) : (
                <button
                  disabled={isPending || balance < item.price}
                  onClick={() => onBuy(item)}
                  style={{
                    ...pressedButton(colors.blue, colors.blueShadow),
                    marginTop: 8,
                    padding: '6px 10px',
                    fontSize: 11.5,
                    width: '100%',
                    opacity: balance < item.price ? 0.5 : 1,
                  }}
                >
                  💰 {item.price}
                </button>
              )}
            </div>
          );
        })}
    </div>
  );
}
