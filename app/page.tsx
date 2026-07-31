import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { colors, fonts, pressedButton } from '@/lib/ui/tokens';

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: memberCount }, { data: userRes }] = await Promise.all([
    supabase.rpc('member_count'),
    supabase.auth.getUser(),
  ]);

  let stats = null;
  if (userRes.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('level, xp, xp_in_level, xp_next, deca_balance, streak_count, role')
      .eq('id', userRes.user.id)
      .single();
    if (profile) {
      stats = {
        level: profile.level as number,
        xp: profile.xp as number,
        xpInLevel: profile.xp_in_level as number,
        xpNext: profile.xp_next as number,
        decaBalance: profile.deca_balance as number,
        streakCount: profile.streak_count as number,
        isOfficer: profile.role === 'officer',
      };
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bg }}>
      <Header stats={stats} />

      <main style={{ flex: 1 }}>
        <section
          style={{
            background: 'linear-gradient(165deg,#bfe6ff 0%,#e7f5ff 60%,#eaf6ff 100%)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: '0 auto',
              padding: '64px 22px 72px',
              display: 'grid',
              gridTemplateColumns: '1.15fr .85fr',
              gap: 30,
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-block',
                  background: '#fff',
                  border: '1.5px solid #cfe6f7',
                  borderRadius: 15,
                  padding: '6px 15px',
                  fontWeight: 800,
                  fontSize: 12,
                  color: '#1c7fc4',
                  marginBottom: 18,
                }}
              >
                🏆&nbsp; The 2026–2027 Season has started!
              </div>
              <h1
                style={{
                  fontFamily: fonts.heading,
                  fontWeight: 800,
                  fontSize: 50,
                  lineHeight: 1.04,
                  color: colors.navyDeep,
                  letterSpacing: -0.5,
                }}
              >
                Bergen County <br />
                Academies DECA
              </h1>
              <p style={{ fontSize: 17, lineHeight: 1.55, color: '#3f648a', marginTop: 16, maxWidth: 430 }}>
                Introducing the BCA DECA Chapter website! This is your designated place to find competition resources,
                information on your events and how to prep for them, practice questions with a live leaderboard, and
                all the important chapter announcements.
                <br />
                <br />
                Let&apos;s see who will be the next big thing!
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 26 }}>
                <Link
                  href="/prep"
                  style={{ ...pressedButton(colors.blue, colors.blueShadow), fontFamily: fonts.heading, fontSize: 16, padding: '14px 24px', display: 'inline-block' }}
                >
                  Start prepping →
                </Link>
                <Link
                  href="/members"
                  style={{
                    border: `2px solid ${colors.borderLight}`,
                    fontFamily: fonts.heading,
                    fontWeight: 700,
                    fontSize: 16,
                    color: '#1c6aa8',
                    background: '#fff',
                    padding: '13px 22px',
                    borderRadius: 7,
                    boxShadow: '0 4px 0 #d7e8f5',
                  }}
                >
                  Members area
                </Link>
              </div>
            </div>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', minHeight: 230 }}>
              <div style={{ fontSize: 140, filter: 'drop-shadow(0 14px 18px rgba(20,90,160,.22))', animation: 'pfloat 3.4s ease-in-out infinite' }}>
                🐧
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 24,
                  background: '#fff',
                  borderRadius: 7,
                  padding: '9px 13px',
                  fontWeight: 800,
                  fontSize: 13,
                  color: '#1c7fc4',
                  boxShadow: '0 6px 18px rgba(30,110,190,.18)',
                  animation: 'pfloat 4s ease-in-out infinite',
                }}
              >
                +50 XP ⚡
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: 40,
                  left: 10,
                  background: '#fff',
                  borderRadius: 7,
                  padding: '9px 13px',
                  fontWeight: 800,
                  fontSize: 13,
                  color: colors.goldText,
                  boxShadow: '0 6px 18px rgba(30,110,190,.18)',
                  animation: 'pfloat 3.7s ease-in-out infinite .5s',
                }}
              >
                🥇 Rank #1
              </div>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 22px 64px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 30 }}>
            <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: '#1c7fc4', marginBottom: 10 }}>
              ABOUT US
            </div>
            <h2 style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 25, color: colors.navy, marginBottom: 11 }}>
              BCA&apos;s DECA Chapter
            </h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#4c6d8f' }}>
              We&apos;re a chapter of the global organization DECA that prepares emerging leaders for their future
              careers through competitive events at the regional, state, and international level. At BCA, DECA is
              exclusively open to students in ABF, the Academy for Business and Finance, allowing our academy to
              apply what we learn in class to solving real issues. Through these case studies, DECA tests our
              knowledge across multiple areas of business, including Marketing, Management, Finance, Entrepreneurship,
              and Hospitality, while developing our critical thinking and public speaking skills. This year, we hope
              to work hard to send as many as we can to a trip to Anaheim at the International Career Development
              Conference.
            </p>
            <div style={{ display: 'flex', gap: 26, marginTop: 22 }}>
              <div>
                <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 26, color: colors.blue }}>
                  {memberCount ?? 0}+
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted }}>Active members</div>
              </div>
              <div>
                <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 26, color: colors.blue }}>34</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted }}>ICDC qualifiers &apos;25</div>
              </div>
              <div>
                <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 26, color: colors.blue }}>12</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted }}>Competitive events</div>
              </div>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(160deg,#0e3a63,#1366b3)', borderRadius: 10, padding: 30, color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: '#9fd2f5', marginBottom: 10 }}>
              Sponsor us
            </div>
            <h2 style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 25, marginBottom: 11 }}>Partner with BCA DECA</h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#cfe6f7' }}>
              Local businesses help send our members to States and ICDC. All sponsors get logo placement on chapter
              materials, conference shout-outs, and a thank-you in our season recap.
              <br />
              <br />
              We&apos;re also offering access to our ABF talent, and sponsors may request promotional material
              designed by our marketing experts, a financial analysis of the business, and any other type of help
              that may be needed.
              <br />
              <br />
              Please reach out to discuss details of becoming a sponsor.
            </p>
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700 }}>
                <span style={{ fontSize: 16 }}>✉️</span>Advisor:{' '}
                <a href="mailto:josgut@bergen.org" style={{ color: '#9fd2f5', fontWeight: 800 }}>
                  josgut@bergen.org
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700 }}>
                <span style={{ fontSize: 16 }}>📍</span> 200 Hackensack Ave, Hackensack NJ
              </div>
            </div>
            <button
              style={{ marginTop: 22, ...pressedButton(colors.gold, colors.goldShadow), color: colors.navy, fontFamily: fonts.heading, fontSize: 15, padding: '12px 20px' }}
            >
              Become a sponsor
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
