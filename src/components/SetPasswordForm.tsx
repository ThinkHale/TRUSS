'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="card mt-6 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (password.length < 8) return setError('Use at least 8 characters.');
        if (password !== confirm) return setError('Those do not match.');
        setBusy(true);
        setError(null);
        const { error: updateError } = await supabaseBrowser().auth.updateUser({ password });
        if (updateError) {
          setError(updateError.message);
          setBusy(false);
          return;
        }
        // An invited account joins its company on this first session.
        router.push('/coach');
        router.refresh();
      }}
    >
      <div>
        <label className="label" htmlFor="sp-password">New password</label>
        <input id="sp-password" type="password" className="field" minLength={8} required autoComplete="new-password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="sp-confirm">Type it again</label>
        <input id="sp-confirm" type="password" className="field" minLength={8} required autoComplete="new-password"
          value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-nogo">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? 'Saving…' : 'Save and continue'}
      </button>
    </form>
  );
}
