import Image from 'next/image';

/**
 * The TRUSS mark.
 *
 * A truss: the triangulated structure that carries load without bending. It is
 * the roof itself, and it is what the methodology does for a sales conversation.
 *
 * This drawn mark is the fallback for places too small for the production
 * lockup — favicons, dense list rows. Anywhere the brand is actually being
 * presented, use BrandLogo instead.
 */

export function TrussMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role="img"
      aria-label="TRUSS"
    >
      {/* Top chord — the roofline. */}
      <path
        d="M2 22 L16 6 L30 22"
        stroke="var(--color-gold-500)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom chord. */}
      <path d="M3 22 H29" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Web members — the five stages carrying the load. */}
      <path
        d="M9 22 L16 6 L23 22 M16 6 V22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <TrussMark size={compact ? 30 : 36} className="shrink-0" />
      <div className="leading-none">
        <div className={compact ? 'text-lg font-extrabold tracking-tight' : 'text-xl font-extrabold tracking-tight'}>
          TRUSS
        </div>
        {!compact && (
          <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-500">
            Sales intelligence for the Trades
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The supplied production lockup: gold truss over the wordmark over the
 * tagline. It is drawn for dark surfaces — the wordmark is white — so on paper
 * it needs a navy plaque behind it rather than being dropped straight on.
 *
 * Callers size it with `className`; the width set here is only the fallback.
 */
export function BrandLogo({
  className = '',
  preload = false,
}: {
  className?: string;
  /** Next 16 replaced `priority` with `preload`. */
  preload?: boolean;
}) {
  return (
    <Image
      src="/brand/truss-logo.png"
      alt="TRUSS — Sales intelligence for the Trades"
      width={1800}
      height={873}
      preload={preload}
      sizes="(max-width: 767px) 200px, 260px"
      className={`h-auto w-60 object-contain ${className}`}
    />
  );
}
