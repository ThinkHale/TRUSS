import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BEAM_WEIGHTS, isPassing, weakestBeam, weightedScore, winRate } from '@/lib/truss/rubric';
import { scorecardSchema } from '@/lib/truss/scoring';

describe('weighted rubric', () => {
  it('weights sum to 100, as the knowledge base defines them', () => {
    assert.equal(Object.values(BEAM_WEIGHTS).reduce((a, b) => a + b, 0), 100);
  });

  it('matches the generated column in migration 0017 across every score combination', () => {
    // The SQL: round((20*t + 15*r + 25*u + 25*s + 15*sec)::numeric / 4)
    for (let t = 0; t <= 4; t++)
      for (let r = 0; r <= 4; r++)
        for (let u = 0; u <= 4; u++)
          for (let s = 0; s <= 4; s++)
            for (let sec = 0; sec <= 4; sec++) {
              const sql = Math.round((20 * t + 15 * r + 25 * u + 25 * s + 15 * sec) / 4);
              assert.equal(weightedScore({ trust: t, relate: r, understand: u, solve: s, secure: sec }), sql);
            }
  });

  it('passes at 75 with no critical finding, and never with one', () => {
    assert.equal(isPassing(75, false), true);
    assert.equal(isPassing(74, false), false);
    assert.equal(isPassing(100, true), false);
    assert.equal(isPassing(null, false), false);
  });

  it('coaches the earliest weak beam on a tie', () => {
    assert.equal(weakestBeam({ trust: 2, relate: 3, understand: 2, solve: 4, secure: 3 }), 'trust');
    assert.equal(weakestBeam({ trust: 3, relate: 3, understand: 1.5, solve: 4, secure: 1.5 }), 'understand');
    assert.equal(weakestBeam({}), null);
  });

  it('has no win rate without decided deals', () => {
    assert.equal(winRate(0, 0), null);
    assert.equal(winRate(3, 4), 0.75);
  });
});

describe('scorecard schema', () => {
  const base = {
    stages: ['trust', 'relate', 'understand', 'solve', 'secure'].map((stage) => ({
      stage, score: 3, evidence: 'q', wentWell: [], improve: 'x', betterLine: null,
    })),
    headline: 'h',
    outcome: 'next-step-set',
    summary: 's',
  };

  it('accepts a scorecard from before critical findings existed', () => {
    const card = scorecardSchema.parse(base);
    assert.deepEqual(card.critical, []);
  });

  it('keeps a finding with an unrecognized code as "other" rather than failing the card', () => {
    const card = scorecardSchema.parse({
      ...base,
      critical: [
        { code: 'deductible', description: 'offered to cover it', evidence: 'we will eat it' },
        { code: 'something-new', description: 'd', evidence: 'e' },
      ],
    });
    assert.deepEqual(card.critical.map((c) => c.code), ['deductible', 'other']);
  });
});
