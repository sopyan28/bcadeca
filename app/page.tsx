import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { colors, fonts, pressedButton } from '@/lib/ui/tokens';

export default async function HomePage() {
  const supabase = await createClient();

  const { data: userRes } = await supabase.auth.getUser();

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
        <div style={{ width: '100%', height: 'clamp(240px, 28vw, 500px)', overflow: 'hidden' }}>
          {/* banner.jpg is square (4096x4096): a fixed-height strip shows a smaller slice of it
              as the viewport widens, which crops the front row's faces off. Scaling height with
              vw keeps the visible band at roughly 37-65% of the photo -- the full group, from the
              back row's hair down past the front row's faces -- at
              every width. Adjust objectPosition, not height, to re-aim the crop. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/photos/banner.jpg" alt="BCA DECA members" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 52%', display: 'block' }} />
        </div>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 26 }}>
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
                <Link
                  href="/jeopardy"
                  style={{ ...pressedButton(colors.gold, colors.goldShadow), color: colors.navy, fontFamily: fonts.heading, fontSize: 16, padding: '14px 24px', display: 'inline-block' }}
                >
                  Play Jeopardy →
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

        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 22px 0' }}>
          <div style={{ background: 'linear-gradient(150deg,#0e3a63,#1c7fc4 60%,#28a3ee)', borderRadius: 12, padding: '32px 34px', color: '#fff', display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(230px,.7fr)', gap: 26, alignItems: 'center', boxShadow: '0 14px 34px rgba(20,80,150,.2)' }}>
            <div>
              <div style={{ display: 'inline-block', background: 'rgba(255,255,255,.16)', borderRadius: 20, padding: '5px 13px', fontWeight: 800, fontSize: 11.5, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 13 }}>New · 20-question matcher</div>
              <h2 style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 30, lineHeight: 1.12, letterSpacing: '-.6px', marginBottom: 11 }}>Not sure which event to compete in?</h2>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: '#d3e9fa', maxWidth: 520 }}>Answer quick questions about your interests, team preference, competition style, speaking, writing, exams, and workload. You’ll get ranked event matches with official DECA guidelines.</p>
              <Link href="/find-your-event" style={{ marginTop: 20, ...pressedButton(colors.gold, colors.goldShadow), color: colors.navy, fontFamily: fonts.heading, fontSize: 15, padding: '13px 22px', display: 'inline-block' }}>Find your event →</Link>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[['20', 'questions on fit and style'], ['60+', 'official event options'], ['4', 'ranked matches for you']].map(([value, label], index) => <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingBottom: index < 2 ? 9 : 0, borderBottom: index < 2 ? '1px solid rgba(255,255,255,.16)' : 'none' }}><span style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 26 }}>{value}</span><span style={{ fontSize: 12.5, fontWeight: 700, color: '#bfe0f7' }}>{label}</span></div>)}
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '44px 22px 64px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
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
                  110+
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted }}>Active members</div>
              </div>
              <div>
                <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 26, color: colors.blue }}>35</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted }}>ICDC qualifiers &apos;26</div>
              </div>
              <div>
                <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 26, color: colors.blue }}>12</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted }}>Competitive events</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 390 }}>
          <div style={{ background: 'linear-gradient(160deg,#0e3a63,#1366b3)', borderRadius: 10, padding: 30, color: '#fff', position: 'relative', overflow: 'hidden', flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: '#9fd2f5', marginBottom: 10 }}>
              Sponsor us
            </div>
            <h2 style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 25, marginBottom: 11 }}>Partner with BCA DECA</h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#cfe6f7' }}>
              Support from local businesses can help us fund the costs of sending members to States and ICDC. All sponsors get logo placement on chapter materials, social media shout-outs, and a thank-you on the website. Please reach out to discuss becoming a sponsor.
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
            <a href="mailto:josgut@bergen.org?subject=BCA%20DECA%20Sponsorship" style={{ marginTop: 22, ...pressedButton(colors.gold, colors.goldShadow), color: colors.navy, fontFamily: fonts.heading, fontSize: 15, padding: '12px 20px', display: 'inline-block' }}>
              Become a sponsor
            </a>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', paddingTop: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/deca-logo.png" alt="DECA" style={{ width: 210, height: 'auto', display: 'block' }} />
          </div>
          </div>
        </section>
      </main>
    </div>
  );
}
