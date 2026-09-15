/**
 * Chapter blazer sizes, as written on the tags: women's sizes with R (regular) or T (tall)
 * lengths, men's chest sizes with S (short) or R (regular) lengths. Rows in blazer_inventory
 * are keyed "W 0R" / "M 36S" (see migration 0015).
 */
export const BLAZER_GROUPS = [
  { key: 'W', label: "Women's", sizes: ['0R', '2R', '4R', '6R', '6', '8', '12', '12T'] },
  { key: 'M', label: "Men's", sizes: ['36S', '38R', '40R', '42S', '42R', '44R', '46R'] },
] as const;

export type BlazerGroupKey = (typeof BLAZER_GROUPS)[number]['key'];

export function blazerKey(group: BlazerGroupKey, size: string) {
  return `${group} ${size}`;
}
