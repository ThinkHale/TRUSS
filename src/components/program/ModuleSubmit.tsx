'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { submitModuleWork } from '@/app/actions/program';

/** A rep's answer for one part of one week: pre-work or field evidence. */
export function ModuleSubmit({
  cohortId,
  week,
  kind,
  label,
  initial,
  checked,
}: {
  cohortId: string;
  week: number;
  kind: 'prework' | 'field';
  label: string;
  initial: string | null;
  checked: boolean;
}) {
  const t = useTranslations('program');
  const router = useRouter();
  const [text, setText] = useState(initial ?? '');
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const id = `mod-${week}-${kind}`;
  const changed = text.trim() !== (initial ?? '').trim();

  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <textarea id={id} className="field min-h-28" value={text} maxLength={8000} onChange={(e) => setText(e.target.value)} />
      {checked && changed && <p className="team-note mt-1">{t('resubmitNote')}</p>}
      <div className="mt-2 flex items-center gap-3">
        <button type="button" className="btn-secondary" disabled={pending || !text.trim() || !changed}
          onClick={() => start(async () => {
            const r = await submitModuleWork({ cohortId, week, kind, text });
            setMessage(r.ok ? { ok: true, text: t('saved') } : { ok: false, text: r.message });
            if (r.ok) router.refresh();
          })}>
          {initial ? t('resubmit') : t('submit')}
        </button>
        {message && <span role="status" className={message.ok ? 'team-result-ok' : 'team-result-bad'}>{message.text}</span>}
      </div>
    </div>
  );
}
