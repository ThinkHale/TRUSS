'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { STAGES, type StageId } from '@/lib/truss/methodology';
import { STAGE_COLOR, cx } from '@/lib/truss/ui';

/**
 * Campaign builder.
 *
 * Every campaign is anchored to a TRUSS stage, because outreach that does not
 * know which stage it serves is the reason most contractor marketing reads the
 * same. Each piece is produced in English and Spanish.
 */

const CHANNELS = ['door-hanger', 'text', 'email', 'voicemail', 'postcard', 'social'] as const;
type Channel = (typeof CHANNELS)[number];

const CHANNEL_LABELS: Record<Channel, string> = {
  'door-hanger': 'Door hanger',
  text: 'Text',
  email: 'Email',
  voicemail: 'Voicemail',
  postcard: 'Postcard',
  social: 'Social',
};

interface Piece {
  channel: Channel;
  language: 'en' | 'es';
  stage: StageId;
  subject: string | null;
  body: string;
  note: string;
}

interface Campaign {
  id: string;
  name: string;
  stage: string;
  audience: string | null;
  pieces: unknown;
  created_at: string;
}

export function CampaignBuilder({ existing }: { existing: Campaign[] }) {
  const t = useTranslations('campaigns');
  const tc = useTranslations('common');

  const [open, setOpen] = useState(existing.length === 0);
  const [name, setName] = useState('');
  const [audience, setAudience] = useState('');
  const [triggerNote, setTriggerNote] = useState('');
  const [stage, setStage] = useState<StageId>('trust');
  const [channels, setChannels] = useState<Channel[]>(['door-hanger', 'text']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState(existing);

  function toggleChannel(channel: Channel) {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    );
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !name.trim() || !audience.trim() || channels.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/campaigns/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          audience: audience.trim(),
          triggerNote: triggerNote.trim() || undefined,
          stage,
          channels,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'failed');

      setCampaigns((prev) => [data.campaign, ...prev]);
      setOpen(false);
      setName('');
      setAudience('');
      setTriggerNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5">
      {!open && (
        <button type="button" className="btn-primary w-full" onClick={() => setOpen(true)}>
          {t('create')}
        </button>
      )}

      {open && (
        <form onSubmit={generate} className="card space-y-4">
          <div>
            <label className="label" htmlFor="campaign-name">{t('name')}</label>
            <input
              id="campaign-name"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="April hail — Cedar Ridge"
            />
          </div>

          <div>
            <label className="label" htmlFor="campaign-audience">{t('audience')}</label>
            <input
              id="campaign-audience"
              className="field"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Homeowners on streets we already repaired"
            />
          </div>

          <div>
            <label className="label" htmlFor="campaign-trigger">{t('trigger')}</label>
            <input
              id="campaign-trigger"
              className="field"
              value={triggerNote}
              onChange={(e) => setTriggerNote(e.target.value)}
              placeholder="1.75in hail, April 14"
            />
          </div>

          <fieldset>
            <legend className="label">{t('stageServed')}</legend>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStage(s.id)}
                  aria-pressed={stage === s.id}
                  className={cx(
                    'min-h-touch rounded-xl border px-4 text-sm font-semibold transition-colors',
                    stage === s.id ? 'border-transparent text-white' : 'border-line-strong text-ink-600',
                  )}
                  style={stage === s.id ? { backgroundColor: STAGE_COLOR[s.id] } : undefined}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="label">{t('channels')}</legend>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((channel) => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => toggleChannel(channel)}
                  aria-pressed={channels.includes(channel)}
                  className={cx(
                    'min-h-touch rounded-xl border px-4 text-sm font-semibold transition-colors',
                    channels.includes(channel)
                      ? 'border-gold-500 bg-gold-500/15 text-gold-600'
                      : 'border-line-strong text-ink-600',
                  )}
                >
                  {CHANNEL_LABELS[channel]}
                </button>
              ))}
            </div>
          </fieldset>

          {error && <p role="alert" className="text-sm text-nogo">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading || !name.trim() || !audience.trim() || channels.length === 0}
            >
              {loading ? tc('loading') : t('generate')}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              {tc('cancel')}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-4">
        {campaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const [copied, setCopied] = useState<string | null>(null);
  const pieces = Array.isArray(campaign.pieces) ? (campaign.pieces as Piece[]) : [];

  async function copy(piece: Piece, key: string) {
    const text = piece.subject ? `${piece.subject}\n\n${piece.body}` : piece.body;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // Clipboard is blocked in some in-app browsers; the text is still selectable.
    }
  }

  return (
    <article className="card">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold">{campaign.name}</h2>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
          style={{ backgroundColor: STAGE_COLOR[campaign.stage as StageId] ?? 'var(--color-gold-500)' }}
        >
          {campaign.stage}
        </span>
      </div>
      {campaign.audience && <p className="mt-1 text-sm text-ink-500">{campaign.audience}</p>}

      <div className="mt-4 space-y-3">
        {pieces.map((piece, i) => {
          const key = `${campaign.id}-${i}`;
          return (
            <div key={key} className="rounded-xl border border-line bg-paper/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-500">
                  {CHANNEL_LABELS[piece.channel] ?? piece.channel}
                  <span className="ml-2 rounded bg-paper-200 px-1.5 py-0.5 text-[10px]">
                    {piece.language.toUpperCase()}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => copy(piece, key)}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-ink-600 hover:bg-paper-200"
                >
                  {copied === key ? t('copied') : t('copy')}
                </button>
              </div>

              {piece.subject && <p className="mt-2 text-sm font-bold">{piece.subject}</p>}
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-800">{piece.body}</p>
              {piece.note && <p className="mt-2 text-xs italic text-ink-400">{piece.note}</p>}
            </div>
          );
        })}
      </div>
    </article>
  );
}
