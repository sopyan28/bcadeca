'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function requestTrifold(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const eventName = String(formData.get('eventName') ?? '').trim();
  const eventDate = String(formData.get('eventDate') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();
  if (!eventName || !eventDate) throw new Error('Event and date are required');

  const { error } = await supabase.from('trifold_requests').insert({
    requested_by: user.id,
    event_name: eventName,
    event_date: eventDate,
    notes: notes || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath('/members');
}
