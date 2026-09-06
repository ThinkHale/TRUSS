import Image from 'next/image';

/**
 * The TRUSS mark, drawn.
 *
 * A Fink truss: bottom chord, two top chords meeting at the apex, a king post
 * down the centre, and a vertical and a diagonal on each side. It is the
 * triangulated structure that carries load without bending — the roof itself,
 * and what the methodology does for a sales conversation.
 *
 * Traced from 02_TRUSS_monochrome_icon_black.png so it matches the production
 * icon rather than approximating it. Strokes rather than fills, because every
 * member is a uniform bar and stroking keeps the geometry legible and editable.
 *
 * This exists for the places that need the mark to take the colour of whatever
 * it sits in. Anywhere the brand is being *presented*, use BrandLogo or
 * Wordmark, which render the real artwork.
 */
export function TrussMark({
  width = 60,
  className = '',
}: {
  /** Width in pixels. Height follows the mark's 3:1 proportion. */
  width?: number;
  className?: string;
}) {
  return (
    <svg
      width={width}
      height={width / 3}
      viewBox="0 0 60 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      className={className}
      role="img"
      aria-label="TRUSS"
    >
      {/* Bottom chord, then the two top chords up to the apex. */}
      <path d="M1.5 18.5 H58.5" strokeLinecap="square" />
      <path d="M1.5 18.5 L30 1.5 L58.5 18.5" strokeLinejoin="miter" strokeLinecap="square" />
      {/* King post. */}
      <path d="M30 1.5 V18.5" strokeLinecap="square" />
      {/* Web members: a vertical and a diagonal each side, mirrored. */}
      <path d="M17 18.5 V9.25 M17 18.5 L30 1.5" strokeLinecap="square" />
      <path d="M43 18.5 V9.25 M43 18.5 L30 1.5" strokeLinecap="square" />
    </svg>
  );
}

/**
 * The gold truss icon, alone.
 *
 * Gold on transparent, so it reads on paper and on navy alike — which is why
 * there is one of these rather than a light and a dark variant.
 */
export function TrussIcon({
  className = '',
  width = 96,
}: {
  className?: string;
  width?: number;
}) {
  return (
    <Image
      src="/brand/truss-icon.png"
      alt=""
      width={1884}
      height={706}
      sizes="(max-width: 767px) 120px, 200px"
      style={{ width, height: 'auto' }}
      className={className}
      aria-hidden
    />
  );
}

/**
 * Icon over wordmark — the stacked lockup from the brand kit.
 *
 * The wordmark is real artwork rather than type, because the letterforms are
 * custom: the squared R and the cut S are not Montserrat and cannot be faked
 * with it. `onDark` picks the white one; light backgrounds get navy.
 *
 * The white file is derived from the navy one rather than taken from the kit.
 * 03_TRUSS_wordmark_white.png ships with a speckled matte — black artefacts
 * scattered through the letterforms — so it is not usable as delivered.
 */
export function Wordmark({
  compact = false,
  onDark = false,
}: {
  compact?: boolean;
  /** True when this sits on navy or another dark surface. */
  onDark?: boolean;
}) {
  const iconWidth = compact ? 74 : 104;

  return (
    <div className="brand-wordmark" data-compact={compact ? '' : undefined}>
      <TrussIcon width={iconWidth} />
      <Image
        src={onDark ? '/brand/truss-wordmark-white.png' : '/brand/truss-wordmark-navy.png'}
        alt="TRUSS"
        width={1980}
        height={509}
        sizes="(max-width: 767px) 160px, 220px"
        style={{ width: compact ? 96 : 132, height: 'auto' }}
      />
      {!compact && (
        <div className="brand-tagline">Sales intelligence for the Trades</div>
      )}
    </div>
  );
}

/**
 * The full production lockup: gold truss over the wordmark over the tagline.
 *
 * Every place this renders is navy — the sidebar, the phone header, the
 * marketing bar, the Coach plaque — so it is the white-text version. The kit
 * ships this lockup with navy text, which is invisible on all four; the file
 * here has its text recoloured to white with the gold left alone. The original
 * is kept as truss-logo-onlight.png for any light surface that wants it.
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
      width={2381}
      height={1158}
      preload={preload}
      sizes="(max-width: 767px) 200px, 260px"
      className={`h-auto w-60 object-contain ${className}`}
    />
  );
}
