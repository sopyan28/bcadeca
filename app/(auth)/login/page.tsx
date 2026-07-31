'use client';

import { Suspense } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn, type ActionState } from '../actions';
import { colors, fieldStyle, pressedButton } from '@/lib/ui/tokens';

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={{ ...pressedButton(colors.blue, colors.blueShadow), padding: '12px 0', marginTop: 6 }}>
      {pending ? 'Logging in…' : 'Log in'}
    </button>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/prep/arena';
  const [state, formAction] = useFormState(signIn, initialState);

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <input type="hidden" name="next" value={next} />
      <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
        School email
        <input name="email" type="email" required autoComplete="email" style={{ ...fieldStyle, marginTop: 6 }} />
      </label>
      <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
        Password
        <input name="password" type="password" required autoComplete="current-password" style={{ ...fieldStyle, marginTop: 6 }} />
      </label>

      {state.error && <div style={{ color: colors.redDark, fontSize: 13.5, fontWeight: 700 }}>{state.error}</div>}

      <SubmitButton />

      <div style={{ textAlign: 'center', fontSize: 13.5, color: colors.textSecondary, marginTop: 8 }}>
        <Link href="/reset-password">Forgot password?</Link>
      </div>
      <div style={{ textAlign: 'center', fontSize: 13.5, color: colors.textSecondary }}>
        New here? <Link href="/signup">Create an account</Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
