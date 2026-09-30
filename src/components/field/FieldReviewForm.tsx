'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Recording or uploading a real conversation for scoring.
 *
 * Nothing is sent until the consent box is ticked. The audio goes straight to
 * private storage with a one-time URL, then the server transcribes it, deletes
 * it, and scores the transcript.
 */
export function FieldReviewForm({ team }: { team: { user_id: string; label: string }[] | null }) {
  const t = useTranslations('field');
  const locale = useLocale();
  const router = useRouter();

  const [consent, setConsent] = useState(false);
  const [context, setContext] = useState('');
  const [language, setLanguage] = useState<'en' | 'es'>(locale === 'es' ? 'es' : 'en');
  const [rep, setRep] = useState('');
  const [audio, setAudio] = useState<{ blob: Blob; seconds: number | null; name: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
  }, []);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Opus at a speech bitrate: a half-hour conversation stays well under 25 MB.
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32_000 });
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
        setAudio({ blob, seconds: Math.round((Date.now() - startedAt.current) / 1000), name: 'recording' });
      };
      recorder.current = rec;
      startedAt.current = Date.now();
      rec.start(1000);
      setRecording(true);
      setElapsed(0);
      timer.current = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 1000);
    } catch {
      setError('Microphone access was blocked. Allow it in your browser settings, or upload a recording instead.');
    }
  }

  function stopRecording() {
    recorder.current?.stop();
    setRecording(false);
    if (timer.current) clearInterval(timer.current);
  }

  async function durationOf(file: File): Promise<number | null> {
    return new Promise((resolve) => {
      const el = document.createElement('audio');
      el.preload = 'metadata';
      el.onloadedmetadata = () => {
        URL.revokeObjectURL(el.src);
        resolve(Number.isFinite(el.duration) ? Math.round(el.duration) : null);
      };
      el.onerror = () => resolve(null);
      el.src = URL.createObjectURL(file);
    });
  }

  async function submit() {
    if (!audio || !consent || context.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const contentType = (audio.blob.type || 'audio/webm').split(';')[0];
      const prep = await fetch('/api/field-review/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, size: audio.blob.size }),
      });
      const slot = await prep.json();
      if (!prep.ok) throw new Error(slot.message ?? slot.error ?? 'Could not start the upload.');

      const { error: uploadError } = await supabaseBrowser()
        .storage.from(slot.bucket)
        .uploadToSignedUrl(slot.path, slot.token, audio.blob, { contentType });
      if (uploadError) throw new Error('The upload did not finish. Check your connection and try again.');

      const res = await fetch('/api/field-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: slot.path,
          context: context.trim(),
          language,
          consent: true,
          repUserId: rep || null,
          durationSeconds: audio.seconds,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? body.error ?? 'Could not score that recording.');
      router.push(`/field/${body.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      <section className="card border-l-4" style={{ borderLeftColor: 'var(--color-gold-500)' }}>
        <p className="font-bold">{t('consentTitle')}</p>
        <p className="mt-1 text-sm text-ink-600">{t('consentBody')}</p>
        <label className="mt-3 flex min-h-touch items-start gap-3 text-sm font-semibold">
          <input type="checkbox" className="mt-0.5 h-5 w-5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          {t('consentCheck')}
        </label>
      </section>

      <section className="card space-y-4">
        <div>
          <label className="label" htmlFor="fr-context">{t('context')}</label>
          <input id="fr-context" className="field" value={context} maxLength={500} placeholder={t('contextHint')}
            onChange={(e) => setContext(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="fr-lang">Language / Idioma</label>
            <select id="fr-lang" className="field" value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'es')}>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
          {team && team.length > 0 && (
            <div>
              <label className="label" htmlFor="fr-rep">{t('who')}</label>
              <select id="fr-rep" className="field" value={rep} onChange={(e) => setRep(e.target.value)}>
                <option value="">{t('me')}</option>
                {team.map((m) => <option key={m.user_id} value={m.user_id}>{m.label}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!recording ? (
            <button type="button" className="btn-secondary" disabled={busy || !consent} onClick={startRecording}>
              ● {t('record')}
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={stopRecording}>
              ■ {t('stop')} · {mm(elapsed)}
            </button>
          )}
          <label className="text-sm font-semibold">
            {t('upload')}{' '}
            <input type="file" accept="audio/*" disabled={busy || recording || !consent} className="mt-1 block text-sm"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 25 * 1024 * 1024) {
                  setError('That recording is over 25 MB. Trim it, or export it at a lower quality.');
                  return;
                }
                setAudio({ blob: file, seconds: await durationOf(file), name: file.name });
              }} />
          </label>
        </div>

        {audio && !recording && (
          <p className="text-sm font-semibold text-go">
            {audio.name === 'recording' ? t('recorded', { min: Math.max(1, Math.round((audio.seconds ?? 0) / 60)) }) : audio.name}
          </p>
        )}

        <button type="button" className="btn-primary w-full" disabled={busy || !audio || !consent || context.trim().length < 3}
          onClick={submit}>
          {busy ? t('working') : t('submit')}
        </button>
        {error && <p role="alert" className="text-sm text-nogo">{error}</p>}
        <p className="team-note">{t('privacy')}</p>
      </section>
    </div>
  );
}
