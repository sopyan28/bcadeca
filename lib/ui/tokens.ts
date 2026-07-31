// Design tokens ported from bca-deca-site.dc.html / README.md "Design Tokens" section.
export const colors = {
  bg: '#eaf6ff',
  blue: '#28a3ee',
  blueShadow: '#1366b3',
  navy: '#0e3a63',
  navyDeep: '#0c3257',
  textSecondary: '#5d7894',
  textMuted: '#7c99b6',
  textFaint: '#9bb4cc',
  border: '#e3eef8',
  borderLight: '#dcebf8',
  borderFaint: '#eef5fb',
  green: '#58c47b',
  greenShadow: '#3ab068',
  gold: '#ffd23f',
  goldShadow: '#d9a800',
  goldText: '#b07d05',
  goldBg: '#fff8e6',
  red: '#ef6f6c',
  redDark: '#d9534f',
  purple: '#9b7bf0',
} as const;

export const fonts = {
  heading: "'Sora', sans-serif",
  body: "'Nunito', sans-serif",
} as const;

export const fieldStyle = {
  width: '100%',
  padding: '11px 13px',
  borderRadius: 8,
  border: `1px solid ${colors.borderLight}`,
  background: colors.bg,
  color: colors.navy,
  fontFamily: fonts.body,
  fontSize: 15,
} as const;

export function pressedButton(bg: string, shadow: string) {
  return {
    border: 'none',
    cursor: 'pointer' as const,
    fontFamily: fonts.body,
    fontWeight: 800,
    color: '#fff',
    background: bg,
    borderRadius: 6,
    boxShadow: `0 5px 0 ${shadow}`,
  };
}
