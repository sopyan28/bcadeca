import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';

export const metadata: Metadata = {
  title: 'DECA Jeopardy | BCA DECA',
};

// Ravi Roy's NJ DECA Jeopardy, embedded rather than copied in so updates to that deployment show up
// here automatically. The host screen and players' phones sync over public MQTT brokers, which work
// fine from inside a frame; players join with the room code shown on the host screen.
const JEOPARDY_URL = 'https://njdeca-jeopardy.vercel.app/';

export default function JeopardyPage() {
  return (
    <div className="jeopardy-page">
      <SiteHeader />
      {/* fullscreen: hosts press F to project the board; autoplay: the game's sound effects. */}
      <iframe src={JEOPARDY_URL} title="NJ DECA Jeopardy" className="jeopardy-frame" allow="fullscreen; autoplay" allowFullScreen />
    </div>
  );
}
