import { SiteHeader } from '@/components/layout/SiteHeader';
import { EventFinder } from '@/components/event-finder/EventFinder';
import { colors } from '@/lib/ui/tokens';

export default function FindYourEventPage() {
  return (
    <div style={{ minHeight: '100vh', background: colors.bg }}>
      <SiteHeader />
      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 22px 60px' }}>
        <EventFinder />
      </main>
    </div>
  );
}
