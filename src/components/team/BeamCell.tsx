import { beamBand } from '@/lib/truss/team';

/** A 0–4 average: the number, tinted by band, so color is never the only signal. */
export function BeamCell({ value }: { value: number | null }) {
  return (
    <span className="beam-cell" data-band={beamBand(value)}>
      {value == null ? '—' : value.toFixed(1)}
    </span>
  );
}

export function Stat({
  label,
  value,
  note,
  bad,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  bad?: boolean;
}) {
  return (
    <div className={bad ? 'team-stat team-stat-bad' : 'team-stat'}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {note && <small>{note}</small>}
    </div>
  );
}
