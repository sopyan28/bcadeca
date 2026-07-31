'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function requireOfficer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'officer') throw new Error('Officers only');
  return { supabase, userId: user.id };
}

export async function createAnnouncement(formData: FormData) {
  const { supabase, userId } = await requireOfficer();
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const kind = String(formData.get('kind') ?? 'general');
  const pinned = formData.get('pinned') === 'on';
  if (!title || !body) throw new Error('Title and body are required');

  const { error } = await supabase.from('announcements').insert({ title, body, kind, pinned, created_by: userId });
  if (error) throw new Error(error.message);

  revalidatePath('/officer/announcements');
  revalidatePath('/members');
}

export async function deleteAnnouncement(id: string) {
  const { supabase } = await requireOfficer();
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/officer/announcements');
  revalidatePath('/members');
}

export async function setBlazerCount(size: string, count: number) {
  const { supabase, userId } = await requireOfficer();
  const { error } = await supabase
    .from('blazer_inventory')
    .upsert({ size, count, updated_by: userId, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);

  revalidatePath('/officer/blazers');
}

export async function updateTrifoldStatus(id: string, status: 'pending' | 'approved' | 'denied' | 'fulfilled') {
  const { supabase } = await requireOfficer();
  const { error } = await supabase.from('trifold_requests').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/officer/trifolds');
}

export async function createInviteCode(formData: FormData) {
  const { supabase, userId } = await requireOfficer();
  const code = String(formData.get('code') ?? '').trim();
  const maxUses = Number(formData.get('maxUses') ?? 1);
  const expiresInDays = Number(formData.get('expiresInDays') ?? 60);
  if (!code) throw new Error('Code is required');

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('officer_invite_codes')
    .insert({ code, max_uses: maxUses, expires_at: expiresAt, created_by: userId });
  if (error) throw new Error(error.message);

  revalidatePath('/officer/invites');
}

export async function deactivateInviteCode(code: string) {
  const { supabase } = await requireOfficer();
  const { error } = await supabase.from('officer_invite_codes').update({ active: false }).eq('code', code);
  if (error) throw new Error(error.message);

  revalidatePath('/officer/invites');
}

export async function uploadConferenceDocument(formData: FormData) {
  const { supabase, userId } = await requireOfficer();
  const file = formData.get('file');
  const conference = String(formData.get('conference') ?? '');
  const docType = String(formData.get('docType') ?? '');
  if (!(file instanceof File) || file.size === 0) throw new Error('A file is required');
  if (!['SCDC', 'ICDC'].includes(conference)) throw new Error('Invalid conference');
  if (!['permission_slip', 'packing_list', 'rooming_form'].includes(docType)) throw new Error('Invalid document type');

  const storagePath = `${conference}/${docType}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from('conference-docs').upload(storagePath, file);
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase.from('conference_documents').insert({
    conference,
    doc_type: docType,
    storage_path: storagePath,
    file_name: file.name,
    uploaded_by: userId,
  });
  if (error) throw new Error(error.message);

  revalidatePath('/officer/documents');
}

export async function deleteConferenceDocument(id: string, storagePath: string) {
  const { supabase } = await requireOfficer();
  const { error: storageError } = await supabase.storage.from('conference-docs').remove([storagePath]);
  if (storageError) throw new Error(storageError.message);
  const { error } = await supabase.from('conference_documents').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/officer/documents');
}

export async function uploadGalleryPhoto(formData: FormData) {
  const { supabase, userId } = await requireOfficer();
  const file = formData.get('file');
  const eventName = String(formData.get('eventName') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();
  const caption = String(formData.get('caption') ?? '').trim();
  if (!(file instanceof File) || file.size === 0) throw new Error('A file is required');
  if (!eventName) throw new Error('Event name is required');

  const storagePath = `${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from('gallery').upload(storagePath, file);
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase.from('gallery_photos').insert({
    event_name: eventName,
    location: location || null,
    caption: caption || null,
    storage_path: storagePath,
    uploaded_by: userId,
  });
  if (error) throw new Error(error.message);

  revalidatePath('/officer/gallery');
  revalidatePath('/past-conferences');
}

export async function deleteGalleryPhoto(id: string, storagePath: string) {
  const { supabase } = await requireOfficer();
  const { error: storageError } = await supabase.storage.from('gallery').remove([storagePath]);
  if (storageError) throw new Error(storageError.message);
  const { error } = await supabase.from('gallery_photos').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/officer/gallery');
  revalidatePath('/past-conferences');
}
