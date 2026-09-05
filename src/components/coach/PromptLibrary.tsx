'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  PROMPT_GROUPS,
  searchPrompts,
  type LibraryPrompt,
  type PromptGroupId,
} from '@/lib/truss/promptLibrary';
import { STAGES, type StageId } from '@/lib/truss/methodology';
import { STAGE_COLOR, cx } from '@/lib/truss/ui';

/**
 * The prompt library.
 *
 * The people using this are not going to learn how to phrase a question to get
 * a good answer, and they should not have to. They browse to the situation they
 * are actually in, tap it, and a well-formed question lands in the composer.
 *
 * Three deliberate choices for that audience:
 *
 *   It opens browsable, not searching. The search box is not autofocused —
 *   raising the keyboard would cover the very list that shows someone what this
 *   thing is. Somebody who does not know what to type sees categories instead.
 *
 *   Tapping fills the composer rather than sending. The rep sees the question
 *   before it goes, which is how they learn what a good question looks like,
 *   and they can add a detail if they have one.
 *
 *   Picking a prompt sets the stage filter to match, visibly. The chips are
 *   right above the composer, so the change is something you watch happen — it
 *   teaches the methodology rather than silently tuning a parameter.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (prompt: string, stage: StageId | null) => void;
}

export function PromptLibrary({ open, onClose, onPick }: Props) {
  const t = useTranslations('coach');
  const locale = (useLocale() === 'es' ? 'es' : 'en') as 'en' | 'es';

  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<PromptGroupId | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const results = useMemo(() => searchPrompts(query, locale, group), [query, locale, group]);

  // Escape closes, and the page behind does not scroll while the sheet is up —
  // on a phone a scrolling backdrop makes the sheet feel broken.
  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  // Reset the filters between openings, so the library always starts from the
  // full list rather than from whatever someone searched for yesterday.
  useEffect(() => {
    if (!open) {
      setQuery('');
      setGroup(null);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="prompt-backdrop" onMouseDown={onClose}>
      <div
        ref={panelRef}
        className="prompt-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-library-title"
        // The backdrop closes on click; the panel must not pass its own clicks up.
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="prompt-sheet-head">
          <div>
            <h2 id="prompt-library-title">{t('libraryTitle')}</h2>
            <p>{t('libraryHint')}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="prompt-close"
            aria-label={t('libraryClose')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="prompt-controls">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('librarySearch')}
            aria-label={t('librarySearch')}
            className="field"
          />

          <div className="prompt-groups">
            <button
              type="button"
              onClick={() => setGroup(null)}
              aria-pressed={group === null}
              className={cx('prompt-group', group === null && 'prompt-group-on')}
            >
              {t('libraryAll')}
            </button>
            {PROMPT_GROUPS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setGroup(group === entry.id ? null : entry.id)}
                aria-pressed={group === entry.id}
                className={cx('prompt-group', group === entry.id && 'prompt-group-on')}
              >
                {entry[locale]}
              </button>
            ))}
          </div>
        </div>

        <ul className="prompt-list">
          {results.map((entry) => (
            <li key={entry.id}>
              <Card entry={entry} locale={locale} onPick={onPick} />
            </li>
          ))}

          {results.length === 0 && (
            <li className="prompt-empty">{t('libraryNoMatch')}</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Card({
  entry,
  locale,
  onPick,
}: {
  entry: LibraryPrompt;
  locale: 'en' | 'es';
  onPick: (prompt: string, stage: StageId | null) => void;
}) {
  const stage = entry.stage ? STAGES.find((s) => s.id === entry.stage) : null;

  return (
    <button type="button" className="prompt-card" onClick={() => onPick(entry[locale].prompt, entry.stage)}>
      <span className="prompt-card-head">
        <b>{entry[locale].situation}</b>
        {stage && (
          <i style={{ backgroundColor: STAGE_COLOR[stage.id] }} aria-hidden>
            {stage.letter}
          </i>
        )}
      </span>
      {/* The question itself, shown rather than hidden: seeing it is how
          somebody learns what a good one looks like. */}
      <span className="prompt-card-body">{entry[locale].prompt}</span>
    </button>
  );
}

/** The button that opens the library. Labeled, never an icon on its own. */
export function PromptLibraryButton({
  onClick,
  variant = 'compact',
}: {
  onClick: () => void;
  variant?: 'compact' | 'wide';
}) {
  const t = useTranslations('coach');

  return (
    <button
      type="button"
      onClick={onClick}
      className={variant === 'wide' ? 'prompt-open-wide' : 'prompt-open'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a1.5 1.5 0 0 0-1.5-1.5h-5A1.5 1.5 0 0 1 4 16z" strokeLinejoin="round" />
        <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 0 20 16z" strokeLinejoin="round" />
      </svg>
      <span>{t('libraryTitle')}</span>
    </button>
  );
}
