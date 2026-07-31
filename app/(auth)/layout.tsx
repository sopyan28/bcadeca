import { colors, fonts } from '@/lib/ui/tokens';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        background: colors.bg,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#fff',
          borderRadius: 16,
          border: `1px solid ${colors.border}`,
          boxShadow: '0 12px 0 ' + colors.borderLight,
          padding: '36px 32px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 22, color: colors.navy }}>
            BCA DECA
          </div>
          <div style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2 }}>Chapter Hub</div>
        </div>
        {children}
      </div>
    </div>
  );
}
