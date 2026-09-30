import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { monthlyRevenue, priceFor, summarizeEconomics, tokenCost } from '@/lib/billing/economics';
import { CERTIFICATION_CRITERIA, PROGRAM, currentWeek, weekWindow } from '@/lib/truss/curriculum';

describe('economics', () => {
  afterEach(() => {
    delete process.env.TRUSS_PRICE_GPT_4_1_IN;
  });

  it('bills cached input at the cached rate, not on top of input', () => {
    // 1M input of which 400k cached, 100k output on gpt-4.1: 0.6*2 + 0.4*0.5 + 0.1*8
    assert.equal(tokenCost('gpt-4.1', 1_000_000, 400_000, 100_000).toFixed(4), (1.2 + 0.2 + 0.8).toFixed(4));
  });

  it('lets an environment variable correct a price without a code change', () => {
    process.env.TRUSS_PRICE_GPT_4_1_IN = '3';
    assert.equal(priceFor('gpt-4.1').price.input, 3);
  });

  it('prices an unknown model instead of treating it as free', () => {
    const { price, known } = priceFor('some-future-model');
    assert.equal(known, false);
    assert.ok(price.input > 0);
  });

  it('prefers a recorded contract over list price, and counts team seats', () => {
    assert.deepEqual(
      monthlyRevenue({ billedPlan: 'enterprise', subscriptionStatus: null, seatLimit: null, contractAnnualValueCents: 12_000_000 }),
      { usd: 10_000, basis: 'contract' },
    );
    assert.deepEqual(
      monthlyRevenue({ billedPlan: 'team', subscriptionStatus: 'active', seatLimit: 12, contractAnnualValueCents: null }),
      { usd: 39 * 12, basis: 'plan' },
    );
    assert.equal(
      monthlyRevenue({ billedPlan: 'pro', subscriptionStatus: 'canceled', seatLimit: 1, contractAnnualValueCents: null }).usd,
      0,
    );
  });

  it('folds one row per model into one row per company with a margin', () => {
    const [org] = summarizeEconomics([
      {
        org_id: 'o', name: 'Apex', kind: 'company', parent_org_id: null, billed_plan: 'team', effective: 'team',
        subscription_status: 'active', seat_limit: 10, members: 10, active_users: 8,
        contract_annual_value_cents: null, practice_seconds: 6000, coach_messages: 400,
        model: 'gpt-4.1', input_tokens: '4000000', cached_input_tokens: '0', output_tokens: '200000', audio_seconds: '0',
      },
      {
        org_id: 'o', name: 'Apex', kind: 'company', parent_org_id: null, billed_plan: 'team', effective: 'team',
        subscription_status: 'active', seat_limit: 10, members: 10, active_users: 8,
        contract_annual_value_cents: null, practice_seconds: 6000, coach_messages: 400,
        model: 'text-embedding-3-small', input_tokens: '1000000', cached_input_tokens: '0', output_tokens: '0', audio_seconds: '0',
      },
    ]);
    assert.equal(org.revenueUsd, 390);
    // 4M * $2 + 0.2M * $8 = 9.60; embeddings 0.02; voice 100 min * 0.18 = 18.
    assert.equal(org.tokenCostUsd.toFixed(2), '9.62');
    assert.equal(org.voiceCostUsd.toFixed(2), '18.00');
    assert.ok(org.grossMarginPct! > 90);
    assert.equal(org.costPerActiveUserUsd!.toFixed(2), ((9.62 + 18) / 8).toFixed(2));
  });
});

describe('program', () => {
  it('carries all eight weeks, each translated', () => {
    assert.deepEqual(PROGRAM.map((w) => w.week), [1, 2, 3, 4, 5, 6, 7, 8]);
    for (const week of PROGRAM) {
      assert.ok(week.title.es && week.focus.es && week.measure.es);
      assert.equal(week.prework.en.length, week.prework.es.length);
      assert.equal(week.fieldTarget.en.length, week.fieldTarget.es.length);
      assert.equal(week.live.en.length, week.live.es.length);
    }
    assert.deepEqual(Object.keys(CERTIFICATION_CRITERIA.en), Object.keys(CERTIFICATION_CRITERIA.es));
  });

  it('knows which week a cohort is in', () => {
    const start = '2026-09-01';
    assert.equal(currentWeek(start, new Date('2026-08-31T12:00:00Z')), 0);
    assert.equal(currentWeek(start, new Date('2026-09-01T12:00:00Z')), 1);
    assert.equal(currentWeek(start, new Date('2026-09-08T12:00:00Z')), 2);
    assert.equal(currentWeek(start, new Date('2027-01-01T12:00:00Z')), 8);
  });

  it('gives each week a seven-day window', () => {
    const w = weekWindow('2026-09-01', 2);
    assert.equal(w.from, '2026-09-08T00:00:00.000Z');
    assert.equal(w.to, '2026-09-15T00:00:00.000Z');
  });
});
