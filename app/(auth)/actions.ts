'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAllowedEmail, allowedDomain } from '@/lib/auth/domain';

export interface ActionState {
  error?: string;
  message?: string;
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('fullName') ?? '').trim();
  const inviteCode = String(formData.get('inviteCode') ?? '').trim();

  if (!fullName) return { error: 'Enter your full name.' };
  if (!isAllowedEmail(email)) return { error: `Use your @${allowedDomain} school email to sign up.` };
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
        ...(inviteCode ? { officer_invite_code: inviteCode } : {}),
      },
    },
  });

  if (error) return { error: error.message };

  return { message: 'Check your school email for a verification link to finish signing up.' };
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/prep/arena');

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  redirect(next.startsWith('/') ? next : '/prep/arena');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!isAllowedEmail(email)) return { error: `Use your @${allowedDomain} school email.` };

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password/confirm`,
  });

  if (error) return { error: error.message };
  return { message: 'If that email is registered, a reset link is on its way.' };
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect('/prep/arena');
}
