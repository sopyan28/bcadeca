import { createClient } from '@/lib/supabase/server';
import { colors, fonts, fieldStyle, pressedButton } from '@/lib/ui/tokens';
import { BLAZER_GROUPS, blazerKey } from '@/lib/blazers';
import { requestTrifold } from './actions';
import { MembersSideNav } from '@/components/members/MembersSideNav';
import { BlazerSizeChart } from '@/components/members/BlazerSizeChart';

// Season 26–27. `end` is the last day, inclusive: steps before today are done and the first one
// that isn't is up next, so the timeline moves along on its own through the year.
const SEASON_TIMELINE = [
  { end: '2026-10-15', date: 'Oct 15', label: 'Chapter kickoff & event sign-ups' },
  { end: '2027-01-10', date: 'Nov–Jan', label: 'Weekly prep + practice role-plays' },
  { end: '2027-01-11', date: 'Jan 11', label: 'Regionals' },
  { end: '2027-03-04', date: 'Mar 2–4', label: 'SCDC' },
  { end: '2027-04-20', date: 'Apr 17–20', label: 'ICDC' },
];

const DOC_TYPES = [
  { key: 'permission_slip', icon: '📝', label: 'Permission slip', hint: 'Required · due 2 weeks prior' },
  { key: 'packing_list', icon: '🎒', label: 'Packing list & rules', hint: 'Dress code, schedule, conduct' },
  { key: 'rooming_form', icon: '🛏️', label: 'Rooming form', hint: 'Pick roommates (4 per room)' },
] as const;

type DocType = (typeof DOC_TYPES)[number];

interface Conference {
  key: string;
  name: string;
  details: string;
  icon: string;
  /** Last day, inclusive. */
  end: string;
  color: string;
  docs: readonly DocType[];
}

// Regionals only collects a permission slip -- no packing list or rooming form.
const REGIONALS: Conference = { key: 'REGIONALS', name: 'Regionals', details: 'Ramapo College · Jan 11', icon: '📍', end: '2027-01-11', color: colors.green, docs: [DOC_TYPES[0]] };
const OVERNIGHT_CONFERENCES: Conference[] = [
  { key: 'SCDC', name: 'SCDC', details: 'Atlantic City, NJ · Mar 2–4', icon: '🏨', end: '2027-03-04', color: colors.blue, docs: DOC_TYPES },
  { key: 'ICDC', name: 'ICDC', details: 'Anaheim, CA · Apr 17–20', icon: '🏨', end: '2027-04-20', color: colors.purple, docs: DOC_TYPES },
];
const CONFERENCES = [REGIONALS, ...OVERNIGHT_CONFERENCES];

const TRIFOLD_STATUS_COLORS: Record<string, string> = {
  pending: colors.goldText,
  approved: colors.green,
  denied: colors.redDark,
  fulfilled: colors.blue,
};

function ConferenceCard({ conf, wide = false, comingSoon, docUrls }: { conf: Conference; wide?: boolean; comingSoon: boolean; docUrls: Map<string, string> }) {
  return (
    <div
      className={comingSoon ? 'conf-upcoming' : undefined}
      style={{
        border: `2px solid ${colors.borderFaint}`,
        borderRadius: 8,
        padding: 20,
        display: 'flex',
        flexDirection: wide ? 'row' : 'column',
        flexWrap: 'wrap',
        alignItems: wide ? 'center' : 'stretch',
        gap: wide ? 24 : 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minWidth: wide ? 200 : undefined }}>
        <div>
          <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 19, color: colors.navy }}>{conf.name}</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: colors.textMuted }}>{conf.details}</div>
        </div>
        {comingSoon ? (
          <span style={{ fontSize: 11, fontWeight: 800, color: colors.textSecondary, background: '#fff', border: `1.5px solid ${colors.borderLight}`, borderRadius: 10, padding: '4px 10px', whiteSpace: 'nowrap' }}>
            Coming soon
          </span>
        ) : (
          <span style={{ fontSize: 24 }}>{conf.icon}</span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: wide ? '1 1 320px' : undefined }}>
        {conf.docs.map((doc) => {
          const url = docUrls.get(`${conf.key}:${doc.key}`);
          return (
            <div key={doc.key} style={{ display: 'flex', alignItems: 'center', gap: 12, border: `1.5px solid ${colors.borderFaint}`, borderRadius: 6, padding: '11px 13px', background: '#fff' }}>
              <span style={{ fontSize: 18 }}>{doc.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: colors.navy }}>{doc.label}</div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.textMuted }}>{doc.hint}</div>
              </div>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ border: 'none', cursor: 'pointer', fontFamily: fonts.body, fontWeight: 800, fontSize: 12, color: '#fff', background: conf.color, padding: '8px 13px', borderRadius: 5, textDecoration: 'none' }}
                >
                  Open
                </a>
              ) : (
                <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.textMuted }}>Not uploaded yet</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: announcements }, { data: blazers }, { data: myTrifolds }, { data: docs }] = await Promise.all([
    supabase.from('announcements').select('id, title, body, kind, pinned, created_at').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('blazer_inventory').select('size, count'),
    user
      ? supabase.from('trifold_requests').select('id, event_name, event_date, status, created_at').eq('requested_by', user.id).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as { id: string; event_name: string; event_date: string; status: string; created_at: string }[] }),
    supabase.from('conference_documents').select('conference, doc_type, storage_path, uploaded_at').order('uploaded_at', { ascending: false }),
  ]);

  const countBySize = new Map((blazers ?? []).map((b) => [b.size, b.count]));

  const latestDocByKey = new Map<string, { storage_path: string }>();
  for (const d of docs ?? []) {
    const key = `${d.conference}:${d.doc_type}`;
    if (!latestDocByKey.has(key)) latestDocByKey.set(key, d);
  }
  const signedUrlByKey = new Map<string, string>();
  await Promise.all(
    Array.from(latestDocByKey.entries()).map(async ([key, doc]) => {
      const { data } = await supabase.storage.from('conference-docs').createSignedUrl(doc.storage_path, 3600);
      if (data?.signedUrl) signedUrlByKey.set(key, data.signedUrl);
    })
  );

  // YYYY-MM-DD in New Jersey, so dates roll over at local midnight rather than UTC's.
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const nextStepIndex = SEASON_TIMELINE.findIndex((step) => step.end >= today);
  // Only the next conference is open; the ones after it haven't started yet and get the stripes.
  const nextConferenceIndex = CONFERENCES.findIndex((conf) => conf.end >= today);
  const isComingSoon = (conf: Conference) => nextConferenceIndex !== -1 && CONFERENCES.indexOf(conf) > nextConferenceIndex;

  async function submitTrifold(formData: FormData) {
    'use server';
    await requestTrifold(formData);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '218px minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
      <aside style={{ position: 'sticky', top: 78, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <MembersSideNav />
        <div style={{ borderRadius: 9, overflow: 'hidden', border: `2px solid ${colors.border}`, boxShadow: '0 8px 20px rgba(20,80,150,.12)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/next-big-thing.webp" alt="DECA Next Big Thing" style={{ width: '100%', height: 290, objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
        </div>
        <a href="mailto:decaboard26-27@bergen.org" style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 9, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, textDecoration: 'none', boxShadow: '0 4px 0 #eef4f9' }}>
          <span style={{ fontWeight: 800, fontSize: 10.5, letterSpacing: '.6px', textTransform: 'uppercase', color: colors.textFaint }}>Questions?</span>
          <span style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 14, color: colors.navy }}>Contact the DECA Board</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1c7fc4', wordBreak: 'break-all' }}>decaboard26-27@bergen.org</span>
        </a>
      </aside>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
      <div id="sec-announce" style={{ scrollMarginTop: 88, background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 22 }}>
        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 17, color: colors.navy, marginBottom: 14 }}>
          📣 Announcements
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(announcements ?? []).map((a) => (
            <div key={a.id} style={{ padding: '12px 14px', border: `1px solid ${colors.borderFaint}`, borderRadius: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: colors.navy }}>
                {a.pinned && '📌 '}
                {a.title}
              </div>
              <div style={{ fontSize: 13.5, color: colors.textSecondary, marginTop: 4, lineHeight: 1.5 }}>{a.body}</div>
            </div>
          ))}
          {(!announcements || announcements.length === 0) && (
            <div style={{ color: colors.textMuted, fontSize: 14 }}>No announcements yet.</div>
          )}
        </div>
      </div>

      <div id="sec-resources" style={{ scrollMarginTop: 88, background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 22 }}>
        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 17, color: colors.navy, marginBottom: 3 }}>
          📚 Resources
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: colors.textMuted, marginBottom: 16 }}>
          Chapter blazers and trifold display stands
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, alignItems: 'start' }}>
          <div style={{ border: `2px solid ${colors.borderFaint}`, borderRadius: 8, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: colors.navy }}>👔 Blazer inventory</div>
              <BlazerSizeChart counts={Object.fromEntries(countBySize)} />
            </div>
            {BLAZER_GROUPS.map((group) => (
              <div key={group.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textFaint, marginBottom: 7 }}>
                  {group.label}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {group.sizes.map((size) => {
                    const count = countBySize.get(blazerKey(group.key, size)) ?? 0;
                    return (
                      <div key={size} style={{ border: `2px solid ${colors.borderFaint}`, borderRadius: 6, padding: '9px 6px', textAlign: 'center' }}>
                        <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 16, color: colors.navy }}>{size}</div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: count > 0 ? colors.green : colors.redDark, marginTop: 2 }}>
                          {count > 0 ? `${count} available` : 'Out'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 1.5 }}>
              Ask a board member to check one out. Blazers are due back within 3 days of your conference.
            </div>
          </div>

          <div style={{ border: `2px solid ${colors.borderFaint}`, borderRadius: 8, padding: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: colors.navy, marginBottom: 12 }}>🪧 Trifold request</div>
            <form action={submitTrifold} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <input name="eventName" required placeholder="Your event (e.g. ENT)" style={fieldStyle} />
              <input name="eventDate" required type="date" style={fieldStyle} />
              <input name="notes" placeholder="Notes (optional)" style={fieldStyle} />
              <button type="submit" style={{ ...pressedButton(colors.blue, colors.blueShadow), padding: '11px 0' }}>
                Request a trifold
              </button>
            </form>
            {myTrifolds && myTrifolds.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {myTrifolds.map((t) => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: colors.textSecondary, fontWeight: 700 }}>
                      {t.event_name} &middot; {t.event_date}
                    </span>
                    <span style={{ color: TRIFOLD_STATUS_COLORS[t.status] ?? colors.textMuted, fontWeight: 800 }}>{t.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div id="sec-season" style={{ scrollMarginTop: 88, background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 22 }}>
        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 17, color: colors.navy, marginBottom: 3 }}>
          📅 Competitive Season 26–27
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: colors.textMuted, marginBottom: 18 }}>
          Timeline, conferences, and required forms
        </div>

        <div style={{ border: `2px solid ${colors.borderFaint}`, borderRadius: 8, padding: '18px 20px', marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textFaint, marginBottom: 16 }}>
            Season timeline
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 11, left: '6%', right: '6%', height: 3, background: colors.borderFaint }} />
            {SEASON_TIMELINE.map((step, i) => {
              const done = step.end < today;
              const now = i === nextStepIndex;
              return (
                <div key={step.label} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20%', textAlign: 'center', zIndex: 1 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: done ? colors.green : now ? colors.gold : '#fff',
                      border: `3px solid ${done ? colors.green : now ? colors.gold : colors.borderLight}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      color: '#fff',
                      fontWeight: 800,
                      marginBottom: 8,
                    }}
                  >
                    {done ? '✓' : now ? '!' : ''}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: now ? colors.goldText : colors.navy }}>{step.date}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, marginTop: 2, lineHeight: 1.3 }}>{step.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Regionals runs wide across the top; SCDC and ICDC sit side by side underneath. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ConferenceCard conf={REGIONALS} wide comingSoon={isComingSoon(REGIONALS)} docUrls={signedUrlByKey} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {OVERNIGHT_CONFERENCES.map((conf) => (
              <ConferenceCard key={conf.key} conf={conf} comingSoon={isComingSoon(conf)} docUrls={signedUrlByKey} />
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
