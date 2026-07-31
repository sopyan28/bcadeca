'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updatePassword, type ActionState } from '../../actions';
import { colors, fieldStyle, pressedButton } from '@/lib/ui/tokens';

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={{ ...pressedButton(colors.blue, colors.blueShadow), padding: '12px 0', marginTop: 6 }}>
      {pending ? 'Saving…' : 'Set new password'}
    </button>
  );
}

export default function ResetPasswordConfirmPage() {
  const [state, formAction] = useFormState(updatePassword, initialState);

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 13.5, color: colors.textSecondary, marginBottom: 4 }}>
        You followed a password reset link. Choose a new password below.
      </p>
      <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
        New password
        <input name="password" type="password" required minLength={8} autoComplete="new-password" style={{ ...fieldStyle, marginTop: 6 }} />
      </label>

      {state.error && <div style={{ color: colors.redDark, fontSize: 13.5, fontWeight: 700 }}>{state.error}</div>}

      <SubmitButton />
    </form>
  );
}
