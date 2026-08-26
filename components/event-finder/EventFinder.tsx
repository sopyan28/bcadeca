'use client';

import { useMemo, useState } from 'react';
import { EVENTS, FINDER_QUESTIONS, describeEvent, scoreEvent } from '@/lib/events/eventFinderData';
import { colors, fonts, pressedButton } from '@/lib/ui/tokens';

type Profile = Record<string, string | number | boolean>;

function buildProfile(answers: number[]): Profile {
  const profile: Profile = {};
  FINDER_QUESTIONS.forEach((question, index) => {
    const answer = answers[index];
    if (answer !== undefined) Object.assign(profile, question.opts[answer]![1]);
  });
  return profile;
}

export function EventFinder() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [complete, setComplete] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [cluster, setCluster] = useState('all');

  const profile = useMemo(() => buildProfile(answers), [answers]);
  const ranked = useMemo(
    () => EVENTS.map((event) => ({ event, ...scoreEvent(event, profile) })).sort((a, b) => b.score - a.score),
    [profile]
  );
  const categories = useMemo(() => Array.from(new Set(EVENTS.map((event) => event.category))).sort(), []);
  const clusters = useMemo(() => Array.from(new Set(EVENTS.map((event) => event.cluster))).sort(), []);
  const visibleEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return EVENTS.filter((event) =>
      (category === 'all' || event.category === category) &&
      (cluster === 'all' || event.cluster === cluster) &&
      (!query || `${event.name} ${event.code}`.toLowerCase().includes(query))
    );
  }, [category, cluster, search]);

  const question = FINDER_QUESTIONS[index]!;
  const selected = answers[index];
  const progress = Math.round(((index + 1) / FINDER_QUESTIONS.length) * 100);

  function choose(answer: number) {
    setAnswers((previous) => {
      const next = previous.slice();
      next[index] = answer;
      return next;
    });
  }

  function reset() {
    setIndex(0);
    setAnswers([]);
    setComplete(false);
    setSearch('');
    setCategory('all');
    setCluster('all');
  }

  if (!complete) {
    return (
      <div>
        <h1 style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 29, color: colors.navy, marginBottom: 8 }}>Find Your Event</h1>
        <p style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 1.55, marginBottom: 20 }}>
          Answer 20 quick questions and we’ll rank DECA events around your interests, preferred format, and workload.
        </p>
        <section style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
            <div style={{ flex: 1, height: 10, background: colors.borderFaint, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,${colors.blue},#5cc8f5)`, borderRadius: 6, transition: 'width .25s ease' }} />
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: colors.textMuted, whiteSpace: 'nowrap' }}>
              Question {index + 1} of {FINDER_QUESTIONS.length}
            </span>
          </div>
          <h2 style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 21, color: colors.navy, lineHeight: 1.35, marginBottom: 18 }}>{question.q}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
            {question.opts.map((option, optionIndex) => {
              const isSelected = selected === optionIndex;
              const optionLabel = String(option[0]);
              return (
                <button
                  key={optionLabel}
                  onClick={() => choose(optionIndex)}
                  style={{
                    textAlign: 'left', cursor: 'pointer', fontFamily: fonts.body, fontWeight: 700, fontSize: 14,
                    padding: '14px 15px', borderRadius: 7, border: `2px solid ${isSelected ? colors.blue : '#dde9f3'}`,
                    background: isSelected ? '#eaf7ff' : '#fff', color: isSelected ? colors.navy : '#2f4a63',
                    boxShadow: isSelected ? `inset 0 0 0 1px ${colors.blue}` : '0 3px 0 #edf3f9',
                  }}
                >
                  {optionLabel}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <button disabled={index === 0} onClick={() => setIndex((value) => value - 1)} style={{ border: '2px solid #dde9f3', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.45 : 1, fontFamily: fonts.body, fontWeight: 800, fontSize: 13.5, color: '#1c6aa8', background: '#fff', padding: '11px 18px', borderRadius: 7 }}>← Back</button>
            <button disabled={selected === undefined} onClick={() => (index < FINDER_QUESTIONS.length - 1 ? setIndex((value) => value + 1) : setComplete(true))} style={{ ...pressedButton(colors.blue, colors.blueShadow), cursor: selected === undefined ? 'default' : 'pointer', opacity: selected === undefined ? 0.45 : 1, fontSize: 14.5, padding: '12px 20px' }}>
              {index === FINDER_QUESTIONS.length - 1 ? 'See my matches →' : 'Next →'}
            </button>
          </div>
        </section>
      </div>
    );
  }

  const top = ranked[0]!;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 29, color: colors.navy, marginBottom: 5 }}>Your Event Matches</h1>
          <p style={{ fontSize: 14, color: colors.textSecondary }}>A starting point based on your answers — talk with your advisor before choosing.</p>
        </div>
        <button onClick={reset} style={{ border: '2px solid #dde9f3', cursor: 'pointer', fontFamily: fonts.body, fontWeight: 800, fontSize: 13, color: '#1c6aa8', background: '#fff', padding: '10px 16px', borderRadius: 7, whiteSpace: 'nowrap' }}>↻ Retake</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(280px,.95fr)', gap: 16, alignItems: 'start' }}>
        <section style={{ background: 'linear-gradient(170deg,#f6fbff,#fff)', border: '2px solid #bfe2fa', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.9px', color: '#1c7fc4', textTransform: 'uppercase', marginBottom: 4 }}>#1 match · {top.event.code}</div>
          <h2 style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 25, color: colors.navyDeep, letterSpacing: '-.4px', lineHeight: 1.15, marginBottom: 12 }}>{top.event.name}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
            {[top.event.category, top.event.cluster, `${top.event.participants} participant${top.event.participants === 1 ? '' : 's'}`].map((item) => <span key={item} style={{ padding: '6px 10px', borderRadius: 20, background: '#eef4f9', color: '#476078', fontSize: 11.5, fontWeight: 800 }}>{item}</span>)}
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#465a72', lineHeight: 1.55, marginBottom: 16 }}>
            This ranked highest because it matches {top.reasons.length ? top.reasons.join(', ') : 'your overall mix of format, workload, and interests'}. <strong>{describeEvent(top.event)}.</strong>
          </p>
          <a href={top.event.url} target="_blank" rel="noreferrer" style={{ ...pressedButton(colors.blue, colors.blueShadow), fontSize: 13.5, padding: '11px 16px', display: 'inline-block' }}>Official DECA guidelines ↗</a>
        </section>
        <section>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px', color: colors.textMuted, marginBottom: 9 }}>Also strong for you</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {ranked.slice(1, 4).map((match, matchIndex) => (
              <div key={match.event.code} style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 7, padding: '13px 15px', display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '.4px' }}>#{matchIndex + 2} match · {match.event.code}</div>
                  <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 15, color: colors.navy, margin: '2px 0' }}>{match.event.name}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: colors.textMuted }}>{describeEvent(match.event)}</div>
                </div>
                <a href={match.event.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 800, color: '#1c6aa8', border: '1.5px solid #dde9f3', borderRadius: 6, padding: '8px 11px', textDecoration: 'none', whiteSpace: 'nowrap' }}>Guidelines ↗</a>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div style={{ borderLeft: '4px solid #ffce3a', background: '#fff8e7', padding: '13px 15px', borderRadius: 6, color: '#66511f', fontSize: 13.5, fontWeight: 600, lineHeight: 1.5, margin: '18px 0' }}>
        Prepared-event rules and annual topics can change. Use the official DECA page as the final authority and confirm what BCA is registering before committing.
      </div>
      <section style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 22 }}>
        <h2 style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 19, color: colors.navy, marginBottom: 12 }}>Browse all events</h2>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 14 }}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search event name or code…" style={{ flex: 1, minWidth: 200, border: `2px solid ${colors.border}`, background: '#fff', padding: '10px 12px', borderRadius: 7, fontFamily: fonts.body, fontWeight: 700, fontSize: 13.5, color: colors.navy, outline: 'none' }} />
          <select value={category} onChange={(event) => setCategory(event.target.value)} style={selectStyle}><option value="all">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={cluster} onChange={(event) => setCluster(event.target.value)} style={selectStyle}><option value="all">All clusters</option>{clusters.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        {visibleEvents.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 11 }}>{visibleEvents.map((event) => <div key={event.code} style={{ border: `2px solid ${colors.borderFaint}`, borderRadius: 7, padding: 13 }}><div style={{ fontSize: 11, fontWeight: 900, color: '#1c7fc4' }}>{event.code}</div><div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 13.5, color: colors.navy, margin: '4px 0 7px', lineHeight: 1.25 }}>{event.name}</div><div style={{ fontSize: 11.5, fontWeight: 700, color: colors.textMuted, lineHeight: 1.4, marginBottom: 9 }}>{event.category} · {event.cluster}</div><a href={event.url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, fontWeight: 800, color: '#1c6aa8' }}>Official guidelines ↗</a></div>)}</div> : <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.textMuted, padding: '20px 0' }}>No matching events.</div>}
      </section>
    </div>
  );
}

const selectStyle = { border: '2px solid #e3eef8', background: '#fff', padding: '10px 12px', borderRadius: 7, fontFamily: fonts.body, fontWeight: 700, fontSize: 13.5, color: colors.navy, outline: 'none' };
