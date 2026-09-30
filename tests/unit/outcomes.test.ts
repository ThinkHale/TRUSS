import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  guessColumnMap,
  normalizeOutcome,
  normalizeStatus,
  parseCsv,
  parseDate,
  parseMoneyToCents,
  rowToRecord,
} from '@/lib/outcomes/normalize';
import { sourceSlug } from '@/lib/outcomes/apply';

describe('status', () => {
  const cases: [string, string | null][] = [
    ['Sold', 'signed'],
    ['Closed Won', 'signed'],
    ['Contract Signed', 'signed'],
    ['Closed Lost', 'lost'],
    ['Not sold', 'lost'],
    ['Cancelled', 'lost'],
    ['canceled', 'lost'],
    ['Job Complete - Paid', 'complete'],
    ['In Production', 'in-production'],
    ['Scheduled', 'in-production'],
    ['Estimate Sent', 'inspected'],
    ['Appointment Set', 'inspected'],
    ['New Lead', 'lead'],
    ['Waiting on HOA', null],
    ['', null],
  ];
  for (const [raw, expected] of cases) {
    it(`"${raw}" → ${expected}`, () => assert.equal(normalizeStatus(raw), expected));
  }
});

describe('money', () => {
  it('reads the formats CRMs export', () => {
    assert.equal(parseMoneyToCents('$18,450.00'), 1845000);
    assert.equal(parseMoneyToCents('18450'), 1845000);
    assert.equal(parseMoneyToCents(18450.5), 1845050);
    assert.equal(parseMoneyToCents(' USD 1,200.5 '), 120050);
  });
  it('refuses nonsense and negatives', () => {
    assert.equal(parseMoneyToCents('TBD'), null);
    assert.equal(parseMoneyToCents('-500'), null);
    assert.equal(parseMoneyToCents(-5), null);
    assert.equal(parseMoneyToCents(''), null);
  });
});

describe('dates', () => {
  it('reads ISO and US formats', () => {
    assert.equal(parseDate('2026-03-14'), '2026-03-14T12:00:00.000Z');
    assert.equal(parseDate('3/14/2026'), '2026-03-14T12:00:00.000Z');
    assert.equal(parseDate('03/14/26'), '2026-03-14T12:00:00.000Z');
    assert.ok(parseDate('2026-03-14T09:30:00Z'));
  });
  it('refuses impossible and ambiguous dates rather than guessing', () => {
    assert.equal(parseDate('2/30/2026'), null);
    assert.equal(parseDate('14.03.2026'), null);
    assert.equal(parseDate('March 14'), null);
  });
});

describe('record', () => {
  it('normalizes a webhook record and reports what it ignored', () => {
    const result = normalizeOutcome({
      external_id: 1042,
      name: ' Smith residence ',
      status: 'Sold',
      contract_value: 'call office',
      signed_at: '3/14/2026',
      rep_email: 'Rep@Apex.com',
      type: 'Residential',
    });
    assert.ok(result.ok);
    if (!result.ok) return;
    assert.equal(result.record.externalId, '1042');
    assert.equal(result.record.name, 'Smith residence');
    assert.equal(result.record.status, 'signed');
    assert.equal(result.record.contractValueCents, null);
    assert.equal(result.record.repEmail, 'rep@apex.com');
    assert.equal(result.record.type, 'residential');
    assert.equal(result.warnings.length, 1);
  });

  it('rejects a record with no id', () => {
    const result = normalizeOutcome({ name: 'x', status: 'Sold' });
    assert.equal(result.ok, false);
  });
});

describe('CSV', () => {
  it('handles quotes, embedded commas and newlines, CRLF, and a BOM', () => {
    const rows = parseCsv('﻿Job ID,Customer,Notes\r\n1,"Smith, Jan","line one\nline two"\r\n2,"O""Neil",x\r\n\r\n');
    assert.deepEqual(rows, [
      ['Job ID', 'Customer', 'Notes'],
      ['1', 'Smith, Jan', 'line one\nline two'],
      ['2', 'O"Neil', 'x'],
    ]);
  });

  it('reads tab-separated exports', () => {
    assert.deepEqual(parseCsv('a\tb\n1\t2'), [['a', 'b'], ['1', '2']]);
  });

  it('maps common CRM headers without being told', () => {
    const headers = ['Job Number', 'Customer Name', 'Job Status', 'Approved Amount', 'Date Sold', 'Sales Rep Email', 'Lead Source'];
    const map = guessColumnMap(headers);
    assert.equal(map.external_id, 0);
    assert.equal(map.name, 1);
    assert.equal(map.status, 2);
    assert.equal(map.contract_value, 3);
    assert.equal(map.signed_at, 4);
    assert.equal(map.rep_email, 5);
    assert.equal(map.lead_source, 6);

    const record = rowToRecord(['J-7', 'Lee', 'Sold', '$9,800', '2026-04-02', 'a@b.co', 'Door'], map);
    const result = normalizeOutcome(record);
    assert.ok(result.ok && result.record.contractValueCents === 980000);
  });
});

describe('source', () => {
  it('slugs a CRM name into the external_source format 0017 enforces', () => {
    assert.equal(sourceSlug('JobNimbus', 'other'), 'jobnimbus');
    assert.equal(sourceSlug('Service Titan!', 'other'), 'service-titan');
    assert.equal(sourceSlug('', 'zapier'), 'zapier');
    assert.match(sourceSlug('x'.repeat(80), 'other'), /^[a-z0-9_-]{1,40}$/);
  });
});
