'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { STAGES, type StageId } from '@/lib/truss/methodology';
import { STAGE_COLOR, cx } from '@/lib/truss/ui';

/**
 * The Coach conversation.
 *
 * Streams over NDJSON rather than SSE so a dropped connection on a job site
 * leaves the partial answer on screen instead of erasing it, and so the
 * conversation id can arrive before the first token.
 */

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  initialConversationId: string | null;
  initialMessages: Message[];
}

export function CoachChat({ initialConversationId, initialMessages }: Props) {
  const t = useTranslations('coach');
  const tc = useTranslations('common');

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [stageFocus, setStageFocus] = useState<StageId | null>(null);

  const conversationId = useRef(initialConversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep the newest message in view as tokens arrive.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setError(null);
    setCitations([]);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }, { role: 'assistant', content: '' }]);
    setStreaming(true);

    try {
      const res = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversationId.current,
          message: trimmed,
          stageFocus,
        }),
      });

      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message ?? payload.error ?? 'request_failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // The last element may be a partial line; hold it for the next read.
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }

          if (event.type === 'meta') {
            conversationId.current = (event.conversationId as string) ?? conversationId.current;
            setCitations((event.citations as string[]) ?? []);
            // Make the conversation linkable without a navigation.
            if (conversationId.current) {
              window.history.replaceState(null, '', `/coach?c=${conversationId.current}`);
            }
          } else if (event.type === 'delta') {
            const delta = event.text as string;
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                role: 'assistant',
                content: next[next.length - 1].content + delta,
              };
              return next;
            });
          } else if (event.type === 'error') {
            setError(event.message as string);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'request_failed';
      setError(message === 'quota_exceeded' ? t('quotaBody') : message);
      // Drop the empty assistant bubble so the screen does not look stuck.
      setMessages((prev) => (prev.at(-1)?.content === '' ? prev.slice(0, -1) : prev));
    } finally {
      setStreaming(false);
      textareaRef.current?.focus();
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Stage focus. Lets a rep drill one stage instead of asking generally. */}
      <div className="flex gap-2 overflow-x-auto border-b border-steel-800 px-5 py-3">
        <StageChip active={stageFocus === null} onClick={() => setStageFocus(null)}>
          {t('allStages')}
        </StageChip>
        {STAGES.map((stage) => (
          <StageChip
            key={stage.id}
            active={stageFocus === stage.id}
            color={STAGE_COLOR[stage.id]}
            onClick={() => setStageFocus(stageFocus === stage.id ? null : stage.id)}
          >
            {stage.name}
          </StageChip>
        ))}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {empty ? (
          <EmptyState onPick={send} />
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((message, i) => (
              <Bubble
                key={i}
                role={message.role}
                content={message.content}
                pending={streaming && i === messages.length - 1 && message.content === ''}
              />
            ))}

            {citations.length > 0 && !streaming && (
              <div className="rounded-xl border border-steel-800 bg-steel-900/60 px-4 py-3 text-xs text-steel-400">
                <span className="font-semibold text-steel-300">{t('sources')}:</span>{' '}
                {[...new Set(citations)].join(' · ')}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="mx-5 mb-2 rounded-xl border border-nogo/40 bg-nogo/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="border-t border-steel-800 bg-steel-950 px-5 py-3"
      >
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends on a desktop keyboard; on a phone it inserts a newline.
              if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder={t('placeholder')}
            aria-label={t('placeholder')}
            className="field max-h-40 flex-1 resize-none py-3"
            disabled={streaming}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="btn-primary aspect-square px-0"
            aria-label={tc('send')}
          >
            {streaming ? (
              <span className="animate-truss-pulse text-lg">•••</span>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  const t = useTranslations('coach');
  const suggestions = ['objection', 'deductible', 'adjuster', 'opener'] as const;

  return (
    <div className="mx-auto max-w-2xl py-6">
      <h2 className="text-xl font-bold">{t('emptyTitle')}</h2>
      <p className="mt-2 text-steel-300">{t('emptyBody')}</p>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {suggestions.map((key) => {
          const text = t(`suggestions.${key}`);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(text)}
              className="min-h-touch rounded-xl border border-steel-700 px-4 py-3 text-left text-sm font-medium text-steel-200 transition-colors hover:border-signal-500 hover:bg-steel-900"
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Bubble({
  role,
  content,
  pending,
}: {
  role: 'user' | 'assistant';
  content: string;
  pending: boolean;
}) {
  const isUser = role === 'user';

  return (
    <div className={cx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cx(
          'max-w-[85%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-signal-500 text-steel-950'
            : 'border border-steel-800 bg-steel-900 text-steel-100',
        )}
      >
        {pending ? (
          <span className="animate-truss-pulse text-steel-400">•••</span>
        ) : (
          // Coach replies are plain prose by design, so newlines are the only
          // formatting to preserve. This also avoids rendering model output as HTML.
          <div className="whitespace-pre-wrap break-words">{content}</div>
        )}
      </div>
    </div>
  );
}

function StageChip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
        active
          ? 'border-transparent text-steel-950'
          : 'border-steel-700 text-steel-300 hover:border-steel-500',
      )}
      style={active ? { backgroundColor: color ?? 'var(--color-signal-500)' } : undefined}
    >
      {children}
    </button>
  );
}
