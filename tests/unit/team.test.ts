import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { beamBand, median, parsePeriod, teamTotals, type RepSummaryRow } from '@/lib/truss/team';

function rep(overrides: Partial<RepSummaryRow>): RepSummaryRow {
  return {
    user_id: crypto.randomUUID(),
    full_name: 'Rep',
    role: 'rep',
    branch_id: null,
    branch_name: null,
    joined_at: '2026-01-01T00:00:00Z',
    simulations: 0,
    practice_seconds: 0,
    avg_trust: null,
    avg_relate: null,
    avg_understand: null,
    avg_solve: null,
    avg_secure: null,
    avg_weighted: null,
    latest_weighted: null,
    last_practiced_at: null,
    critical_count: 0,
    first_passing_at: null,
    ramp_days: null,
    field_reviews: 0,
    field_avg_weighted: null,
    deals_won: 0,
    deals_lost: 0,
    won_value_cents: 0,
    certified: false,
    ...overrides,
  };
}

describe('team totals', () => {
  it('weights beam averages by simulations taken', () => {
    const totals = teamTotals([
      rep({ simulations: 9, avg_trust: '3.00', avg_relate: 3, avg_understand: 3, avg_solve: 3, avg_secure: 3, avg_weighted: 75 }),
      rep({ simulations: 1, avg_trust: '1.00', avg_relate: 1, avg_understand: 1, avg_solve: 1, avg_secure: 1, avg_weighted: 25 }),
    ]);
    assert.equal(totals.beamAverages.trust, 2.8);
    assert.equal(totals.avgWeighted, 70);
  });

  it('splits win rate by practice without counting managers as reps', () => {
    const totals = teamTotals([
      rep({ practice_seconds: 4000, deals_won: 6, deals_lost: 4 }),
      rep({ practice_seconds: 3600, deals_won: 2, deals_lost: 0 }),
      rep({ practice_seconds: 600, deals_won: 1, deals_lost: 3 }),
      rep({ role: 'manager', practice_seconds: 0, deals_won: 10, deals_lost: 0 }),
    ]);
    assert.deepEqual(totals.practiced, { reps: 2, won: 8, decided: 12, winRate: 8 / 12 });
    assert.deepEqual(totals.unpracticed, { reps: 1, won: 1, decided: 4, winRate: 0.25 });
    assert.equal(totals.reps, 3);
    assert.equal(totals.dealsWon, 19, 'team totals still include everyone who sold');
  });

  it('reports a median ramp over reps who have passed', () => {
    const totals = teamTotals([rep({ ramp_days: 10 }), rep({ ramp_days: 30 }), rep({ ramp_days: 14 }), rep({})]);
    assert.equal(totals.medianRampDays, 14);
    assert.equal(median([]), null);
    assert.equal(median([1, 2, 3, 4]), 2.5);
  });

  it('bands averages for display', () => {
    assert.equal(beamBand(3.2), 'good');
    assert.equal(beamBand(2), 'mid');
    assert.equal(beamBand(1.99), 'low');
    assert.equal(beamBand(null), 'none');
  });

  it('only accepts the periods the page offers', () => {
    assert.equal(parsePeriod('30'), 30);
    assert.equal(parsePeriod('7'), 90);
    assert.equal(parsePeriod(undefined), 90);
  });
});
