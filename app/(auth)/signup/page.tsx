'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { signUp, type ActionState } from '../actions';
import { colors, fieldStyle, pressedButton } from '@/lib/ui/tokens';
import { allowedDomain } from '@/lib/auth/domain';

const initialState: ActionState = {};

// School accounts are Microsoft 365, so send members straight to Outlook on the web rather
// than making them go find the tab themselves.
const SCHOOL_MAIL_URL = 'https://outlook.office.com/mail/';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={{ ...pressedButton(colors.blue, colors.blueShadow), padding: '12px 0', marginTop: 6 }}>
      {pending ? 'Creating account…' : 'Create account'}
    </button>
  );
}

export default function SignupPage() {
  const [state, formAction] = useFormState(signUp, initialState);

  if (state.message) {
    return (
      <div style={{ textAlign: 'center', color: colors.navy }}>
        <p style={{ fontWeight: 700, marginBottom: 8 }}>Almost there!</p>
        <p style={{ color: colors.textSecondary, fontSize: 14.5, lineHeight: 1.55 }}>
          Check your{' '}
          <a href={SCHOOL_MAIL_URL} target="_blank" rel="noopener noreferrer" style={{ color: colors.blue, fontWeight: 800 }}>
            email
          </a>{' '}
          for a verification link to finish signing up.
        </p>
        <p style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.5, marginTop: 10 }}>
          It can take a minute to arrive. If it&rsquo;s not there, check your <strong>junk</strong> or{' '}
          <strong>spam</strong> folder.
        </p>
        <Link href="/login" style={{ display: 'inline-block', marginTop: 18, fontSize: 13.5 }}>
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
        Full name
        <input name="fullName" type="text" required style={{ ...fieldStyle, marginTop: 6 }} />
      </label>
      <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
        School email (@{allowedDomain})
        <input name="email" type="email" required autoComplete="email" style={{ ...fieldStyle, marginTop: 6 }} />
      </label>
      <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
        Password
        <input name="password" type="password" required minLength={8} autoComplete="new-password" style={{ ...fieldStyle, marginTop: 6 }} />
      </label>
      <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
        DECA Board invite code (optional)
        <input name="inviteCode" type="text" style={{ ...fieldStyle, marginTop: 6 }} />
      </label>

      {state.error && <div style={{ color: colors.redDark, fontSize: 13.5, fontWeight: 700 }}>{state.error}</div>}

      <SubmitButton />

      <div style={{ textAlign: 'center', fontSize: 13.5, color: colors.textSecondary, marginTop: 8 }}>
        Already have an account? <Link href="/login">Log in</Link>
      </div>
    </form>
  );
}
